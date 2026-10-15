const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const BASE = `${API_URL}/api`;
const CREDENTIALS =
  import.meta.env.VITE_API_CREDENTIALS === "false" ? "omit" : "include";

if (import.meta.env.PROD && !API_URL) {
  console.warn(
    "VITE_API_URL isn't set; API calls will go to this site's own origin and probably 404.",
  );
}

const DEFAULT_TIMEOUT_MS = 20_000;
const CHAT_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export class ApiError extends Error {
  constructor(message, status, data = null, code = "http") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = code;
  }
  get isNetwork() {
    return this.code === "network" || this.code === "timeout";
  }
  get isAborted() {
    return this.code === "aborted";
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function backoff(attempt, retryAfter) {
  const header = Number(retryAfter);
  if (Number.isFinite(header) && header > 0)
    return Math.min(header * 1000, 5000);
  return Math.min(4000, 400 * 2 ** attempt) + Math.random() * 150;
}

function friendlyStatus(status) {
  if (status === 401) return "Please sign in to continue.";
  if (status === 403) return "You don't have access to that.";
  if (status === 404) return "Not found.";
  if (status === 413) return "That file is too large.";
  if (status === 429) return "Too many requests. Wait a moment and try again.";
  if (status >= 500)
    return "Something went wrong on the server. Try again in a moment.";
  return `Request failed (${status})`;
}

async function attempt(url, init, timeout, outerSignal) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeout);
  const onAbort = () => ctrl.abort();

  if (outerSignal) {
    if (outerSignal.aborted) ctrl.abort();
    else outerSignal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = res.status === 204 ? "" : await res.text();
    return { res, text };
  } catch {
    if (outerSignal?.aborted)
      throw new ApiError("Request cancelled.", 0, null, "aborted");
    if (timedOut)
      throw new ApiError(
        "The server took too long to respond. Try again.",
        0,
        null,
        "timeout",
      );
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      0,
      null,
      "network",
    );
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onAbort);
  }
}

async function request(
  path,
  { method = "GET", body, form, signal, timeout, retries } = {},
) {
  const url = `${BASE}${path}`;
  const init = {
    method,
    credentials: CREDENTIALS,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  };
  const maxRetries = retries ?? (method === "GET" ? 2 : 0);
  const limit = timeout ?? (form ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  for (let i = 0; ; i++) {
    try {
      const { res, text } = await attempt(url, init, limit, signal);
      if (res.status === 204) return null;

      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        if (RETRYABLE_STATUS.has(res.status) && i < maxRetries) {
          await sleep(backoff(i, res.headers.get("Retry-After")));
          continue;
        }
        throw new ApiError(
          data?.error || data?.message || friendlyStatus(res.status),
          res.status,
          data,
        );
      }
      return data;
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork && i < maxRetries) {
        await sleep(backoff(i));
        continue;
      }
      throw e;
    }
  }
}

const inflight = new Map();
function get(path, opts) {
  if (opts?.signal) return request(path, opts);
  if (inflight.has(path)) return inflight.get(path);
  const p = request(path, opts).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

const RELATED_TTL_MS = 30 * 60 * 1000;
const relatedKey = (question, page, variant = 0) =>
  `sc:related:${page}:${variant}:${question.trim().toLowerCase()}`;

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return Date.now() - t < RELATED_TTL_MS ? v : null;
  } catch {
    return null;
  }
}
function writeCache(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {}
}

export const apiGet = (path, opts) => get(path, opts);
export const apiPost = (path, body = {}, opts) =>
  request(path, { ...opts, method: "POST", body });
export const apiDelete = (path, opts) =>
  request(path, { ...opts, method: "DELETE" });

export const api = {
  health: () => request("/health", { timeout: 8000 }),

  listDocuments: (opts) => get("/documents", opts),
  uploadDocument: (file, opts) => {
    const form = new FormData();
    form.append("file", file);
    return request("/documents/upload", { ...opts, method: "POST", form });
  },
  deleteDocument: (id, opts) =>
    request(`/documents/${id}`, { ...opts, method: "DELETE" }),

  createSession: (title, opts) =>
    request("/sessions", { ...opts, method: "POST", body: { title } }),
  listSessions: (opts) => get("/sessions", opts),
  deleteSession: (id, opts) =>
    request(`/sessions/${id}`, { ...opts, method: "DELETE" }),
  getMessages: (sessionId, opts) =>
    get(`/sessions/${sessionId}/messages`, opts),

  ask: (sessionId, question, documentIds, opts) =>
    request("/chat", {
      ...opts,
      method: "POST",
      body: { sessionId, question, documentIds },
      timeout: CHAT_TIMEOUT_MS,
    }),

  me: () => request("/auth/me", { timeout: 8000 }),
  login: ({ email, password, remember }) =>
    request("/auth/login", {
      method: "POST",
      body: { email, password, remember },
    }),
  register: ({ name, email, password }) =>
    request("/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),
  guest: () => request("/auth/guest", { method: "POST", body: {} }),
  logout: () => request("/auth/logout", { method: "POST", body: {} }),

  related: async (
    question,
    page = 1,
    { signal, fresh = false, variant = 0 } = {},
  ) => {
    const key = relatedKey(question, page, variant);
    if (!fresh) {
      const hit = readCache(key);
      if (hit) return hit;
    }
    const data = await request("/related", {
      method: "POST",
      body: { question, page, variant },
      signal,
      retries: 1,
    });
    if (data) writeCache(key, data);
    return data;
  },
};
