# StudyCite API

This is the backend for StudyCite. It runs on Cloudflare Workers, stores everything in a D1 (SQLite) database, and uses a small scoring kernel written in C++ and compiled to WebAssembly. The kernel's job is to rank pieces of your documents against a question, which is how each answer ends up pointing back to the exact passage it came from.

There are no servers to look after and no Docker. The compiled kernel (`src/kernel.wasm`) is checked into the repo, so you only need to rebuild it if you edit `cpp/kernel.cpp`.

## What it does

People can sign up with an email and password, or just jump in as a guest. Each person gets their own private library: their documents, their chat sessions and their messages are only visible to them.

You upload a PDF, DOCX, TXT or Markdown file, and the API splits it into passages and indexes them. When you ask a question, every sentence in the answer is taken straight from one of your documents and tagged with a numbered citation, so nothing in an answer comes from outside your sources.

For extra reading, the API also searches Wikipedia, OpenAlex (scholarly papers) and Open Library (books) for material related to your question. None of those need an API key.

## Endpoints

Everything except the health check and the auth routes needs you to be signed in.

```
GET    /api/health
GET    /api/auth/me
POST   /api/auth/register        { name, email, password }
POST   /api/auth/login           { email, password, remember }
POST   /api/auth/guest
POST   /api/auth/logout

GET    /api/documents
POST   /api/documents/upload     multipart form, field name "file"
DELETE /api/documents/:id

GET    /api/sessions
POST   /api/sessions
DELETE /api/sessions/:id
GET    /api/sessions/:id/messages

POST   /api/chat                 { sessionId, question, documentIds? }
GET    /api/related              ?q=...   (POST with { question, page, variant } also works)
```

## Deploying

Run all of this from the `worker` folder.

1. Install dependencies and log in to Cloudflare.

   ```bash
   cd worker
   npm install
   npx wrangler login
   ```

2. Create the database.

   ```bash
   npx wrangler d1 create studycite
   ```

   Wrangler will print a `database_id`. Paste it into `wrangler.toml`.

3. Create the tables.

   ```bash
   npm run db:remote
   ```

4. In `wrangler.toml`, set `ALLOWED_ORIGIN` to your site's address, for example `https://YOUR-SITE.pages.dev`. The API turns away requests from any other origin. If you have more than one, separate them with commas.

5. Set the secret that signs login cookies.

   ```bash
   npx wrangler secret put AUTH_SECRET
   ```

   Use something long and random (`openssl rand -base64 48` works well) and keep it to yourself. Without it, anything that needs a signed-in user will fail.

6. Deploy.

   ```bash
   npm run deploy
   ```

   Wrangler prints your API address, something like `https://studycite-api.<you>.workers.dev`.

7. Make sure it's alive by opening `/api/health` on that address. You should see:

   ```json
   {"ok":true,"kernel":"wasm"}
   ```

8. Hook up the frontend. In Cloudflare Pages, go to your project's Settings, then Environment variables, and add `VITE_API_URL` with your Worker's address. Redeploy the site so it picks up the change.

## Settings

These live in `wrangler.toml` unless noted.

- `ALLOWED_ORIGIN`: the site address(es) allowed to talk to the API.
- `MAX_DOCUMENTS`: how many documents each person can keep. Defaults to 5.
- `CONTACT_EMAIL`: optional. OpenAlex gives faster service to requests that include a contact address.
- `CONTACT_URL`: optional. Included in the User-Agent on outside lookups.
- `AUTH_SECRET`: set with `wrangler secret put`, never in the file. Don't commit it.

## Running it locally

First, make a file called `.dev.vars` in the `worker` folder with a secret of your own, and add it to `.gitignore` so it never gets committed:

```
AUTH_SECRET=any-long-random-string
```

Then:

```bash
npm run db:local
npm run dev
```

The API will be at `http://localhost:8787`. While you're developing, add your frontend's local address (for example `http://localhost:5173`) to `ALLOWED_ORIGIN`.

## Rebuilding the kernel

You only need this after changing `cpp/kernel.cpp`.

```bash
npm run build:wasm
```

It needs a clang that can target `wasm32`, and the one that comes with macOS can't. Install LLVM first:

```bash
brew install llvm lld
```

## Things to know

The free Workers plan allows about 10 ms of CPU per request. That's plenty for small text files, but PDFs, DOCX files, bigger documents and password hashing at sign-up or login can push past it and give you "Error 1102". Workers Paid ($5 a month) raises the limit to 30 seconds.

Uploads can be up to 10 MB, and each person can keep 5 documents by default. Scanned PDFs with no text layer can't be read yet. Questions are capped at 2,000 characters.

After 10 failed login attempts on one email, that email is locked out for 15 minutes.

Guests get a normal private library, but their session ends when the browser closes, so there's no way back into it afterwards.

Login cookies are set with `SameSite=None; Secure` so the site and the API can sit on different domains. The upside is flexibility, and the catch is that the API has to be served over HTTPS.
