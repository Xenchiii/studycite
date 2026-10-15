import { HttpError, json } from "./http.js";

const COOKIE = "sc_session";
const DAY = 24 * 60 * 60;
const ITERATIONS = 100_000;
const FAIL_LIMIT = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const enc = new TextEncoder();

const toB64u = (bytes) => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );


  async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      256,
    ),
  );
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64u(salt)}$${toB64u(hash)}`;
}

async function checkPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored).split("$");
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  const got = await pbkdf2(password, fromB64u(salt), Number(iter));
  const want = fromB64u(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

function hmacKey(env) {
  if (!env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set");
  return crypto.subtle.importKey(
    "raw",
    enc.encode(env.AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signToken(env, userId, ttlSeconds) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(env),
    enc.encode(payload),
  );
  return `${payload}.${toB64u(sig)}`;
}

async function readToken(env, token) {
  const [id, exp, sig] = String(token).split(".");
  if (!id || !exp || !sig || Number(exp) < Date.now() / 1000) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(env),
      fromB64u(sig),
      enc.encode(`${id}.${exp}`),
    );
    return ok ? Number(id) : null;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
// SameSite=None so the cookie also works when the site and API are on different domains.
const setCookie = (token, maxAge) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None${maxAge ? `; Max-Age=${maxAge}` : ""}`;
const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  guest: !!u.is_guest,
});

export async function currentUser(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token) return null;
  const id = await readToken(env, token);
  if (!id) return null;
  return (
    (await env.DB.prepare(
      "SELECT id, name, email, is_guest FROM users WHERE id = ?",
    )
      .bind(id)
      .first()) || null
  );
}

async function signedIn(env, user, remember, status = 200) {
  const ttl = remember ? 30 * DAY : DAY;
  const token = await signToken(env, user.id, ttl);
  return json({ user: publicUser(user) }, status, {
    "Set-Cookie": setCookie(token, remember ? ttl : 0),
  });
}

async function register(request, env) {
  const b = await request.json().catch(() => ({}));
  const name = String(b?.name ?? "")
    .trim()
    .slice(0, 80);
  const email = String(b?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(b?.password ?? "");

  if (!name) throw new HttpError(400, "Name is required.");
  if (!EMAIL_RE.test(email))
    throw new HttpError(400, "Enter a valid email address.");
  if (password.length < 8)
    throw new HttpError(400, "Password must be at least 8 characters.");
  if (password.length > 200) throw new HttpError(400, "Password is too long.");

  const taken = await env.DB.prepare("SELECT 1 AS x FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (taken)
    throw new HttpError(409, "An account with that email already exists.");

  const hash = await hashPassword(password);
  let user;
  try {
    user = await env.DB.prepare(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id, name, email, is_guest",
    )
      .bind(name, email, hash)
      .first();
  } catch (e) {
    if (String(e.message).includes("UNIQUE"))
      throw new HttpError(409, "An account with that email already exists.");
    throw e;
  }
  return signedIn(env, user, true, 201);
}

async function login(request, env) {
  const b = await request.json().catch(() => ({}));
  const email = String(b?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(b?.password ?? "");
  const remember = b?.remember !== false;

  const { n } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM login_failures WHERE email = ? AND at > ?",
  )
    .bind(email, Date.now() - FAIL_WINDOW_MS)
    .first();
  if (n >= FAIL_LIMIT)
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");

  const row = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ? AND is_guest = 0",
  )
    .bind(email)
    .first();
  let ok = false;
  if (row) ok = await checkPassword(password, row.password_hash);
  else await hashPassword(password);

  if (!ok) {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO login_failures (email, at) VALUES (?, ?)",
      ).bind(email, Date.now()),
      env.DB.prepare("DELETE FROM login_failures WHERE at < ?").bind(
        Date.now() - FAIL_WINDOW_MS,
      ),
    ]);
    throw new HttpError(401, "Incorrect email or password.");
  }

  await env.DB.prepare("DELETE FROM login_failures WHERE email = ?")
    .bind(email)
    .run();
  return signedIn(env, row, remember);
}

async function guest(env) {
  const id = crypto.randomUUID();
  const hash = await hashPassword(crypto.randomUUID());
  const user = await env.DB.prepare(
    "INSERT INTO users (name, email, password_hash, is_guest) VALUES ('Guest', ?, ?, 1) RETURNING id, name, email, is_guest",
  )
    .bind(`guest-${id}@guest.invalid`, hash)
    .first();
  return signedIn(env, user, false, 201);
}

export async function handleAuth(path, method, request, env) {
  if (!path.startsWith("/api/auth/")) return null;
  if (path === "/api/auth/me" && method === "GET") {
    const user = await currentUser(request, env);
    return json({ user: user ? publicUser(user) : null });
  }
  if (path === "/api/auth/register" && method === "POST")
    return register(request, env);
  if (path === "/api/auth/login" && method === "POST")
    return login(request, env);
  if (path === "/api/auth/guest" && method === "POST") return guest(env);
  if (path === "/api/auth/logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie });
  }
  return null;
}
