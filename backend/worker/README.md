# StudyCite API

The backend for StudyCite, running on Cloudflare Workers. It's a small JavaScript Worker with a D1 (SQLite) database, plus a scoring kernel written in C++ and compiled to WebAssembly. The kernel ranks document chunks against a question, which is how answers get matched back to their sources.

There are no servers to manage and no Docker. The compiled kernel (`src/kernel.wasm`) is committed to the repo, so you only need to rebuild it if you change the C++ in `cpp/kernel.cpp`.

## Deploying

Everything below runs from the `worker` folder.

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

   Wrangler prints a `database_id`. Copy it into `wrangler.toml`.

3. Create the tables.

```bash
   npm run db:remote
```

4. Open `wrangler.toml` and set `ALLOWED_ORIGIN` to your site's URL, for example `https://YOUR-SITE.pages.dev`. Requests from any other origin are refused.

5. Deploy.

```bash
   npm run deploy
```

   Wrangler prints your API address, which looks like `https://studycite-api.<you>.workers.dev`.

6. Check that it's alive by opening `/api/health` on that address. You should see:

```json
   {"ok":true,"kernel":"wasm"}
```

7. Connect the frontend. In Cloudflare Pages, open your project, go to Settings, then Environment variables, and add `VITE_API_URL` set to your Worker's address. Redeploy the site so it picks up the new value.

## Running it locally

```bash
npm run db:local
npm run dev
```

The API will be at `http://localhost:8787`.

## Rebuilding the kernel

Only needed after editing `cpp/kernel.cpp`.

```bash
npm run build:wasm
```

This needs a clang that can target `wasm32`. The clang that ships with macOS can't, so install LLVM first:

```bash
brew install llvm lld
```

## Limits worth knowing about

- **CPU time.** The free Workers plan gives each request about 10 ms of CPU. That's fine for small TXT and Markdown files, but parsing PDFs or DOCX files and scoring larger documents will hit "Error 1102". Workers Paid ($5/month) raises the limit to 30 seconds.
- **Uploads.** Files can be up to 10 MB, and the library holds at most 5 documents (set by `MAX_DOCUMENTS`).
- **No accounts.** There's no sign-in on the backend yet, so everyone using the same deployment shares one library.