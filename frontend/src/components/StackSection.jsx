import { useMemo, useState } from "react";
import "../styles/StackSection.css";

const LANGS = {
  js: "JavaScript",
  css: "CSS",
  sql: "SQL",
  py: "Python",
  cpp: "C++",
};

const GROUPS = {
  web: "Web app",
  ai: "AI engine (hand-built)",
};

const STACK_ITEMS = [
  {
    layer: "web",
    role: "Frontend",
    tech: "React + Vite",
    lang: "js",
    note: "component-based, fast dev reload",
  },
  {
    layer: "web",
    role: "Styling",
    tech: "Hand-written CSS",
    lang: "css",
    note: "no framework, every rule is intentional",
  },
  {
    layer: "web",
    role: "Backend",
    tech: "Node.js + Express",
    lang: "js",
    note: "REST API, one router per concern",
  },
  {
    layer: "web",
    role: "Database",
    tech: "SQLite",
    lang: "sql",
    note: "documents, chunks, sessions, citations",
  },
  {
    layer: "web",
    role: "File parsing",
    tech: "pdf-parse + mammoth",
    lang: "js",
    note: "PDF and DOCX ingestion",
  },

  {
    layer: "ai",
    role: "Engine",
    tech: "Custom Python pipeline",
    lang: "py",
    note: "tokenizing, chunking and ranking written from scratch, with no hosted model",
  },
  {
    layer: "ai",
    role: "Retrieval",
    tech: "TF-cosine scoring",
    lang: "py",
    note: "no paid embeddings API required",
  },
  {
    layer: "ai",
    role: "Scoring core",
    tech: "C++ similarity kernel",
    lang: "cpp",
    note: "compiled hot loop that ranks every chunk quickly",
  },
  {
    layer: "ai",
    role: "Glue",
    tech: "Node ↔ Python",
    lang: "js",
    note: "Express hands off the question; scored chunks come back for citing",
  },
];

const PIPELINE = [
  { step: "Upload", lang: "js", note: "Express accepts the file" },
  { step: "Parse", lang: "js", note: "pdf-parse or mammoth pulls out text" },
  { step: "Chunk", lang: "py", note: "text split into overlapping passages" },
  {
    step: "Score",
    lang: "cpp",
    note: "every chunk ranked against the question",
  },
  { step: "Cite", lang: "py", note: "top passages returned with excerpts" },
];

const FILTERS = [
  { id: "all", label: "Everything" },
  { id: "web", label: "Web app" },
  { id: "ai", label: "AI engine" },
];

function LangTag({ lang }) {
  return <span className={`stk-lang lang-${lang}`}>{LANGS[lang]}</span>;
}

export default function StackSection() {
  const [filter, setFilter] = useState("all");

  const rows = useMemo(
    () => STACK_ITEMS.filter((it) => filter === "all" || it.layer === filter),
    [filter],
  );
  const langCount = useMemo(
    () => new Set(rows.map((r) => r.lang)).size,
    [rows],
  );
  const layers = Object.keys(GROUPS).filter((l) =>
    rows.some((r) => r.layer === l),
  );

  return (
    <section className="stack-section" id="stack">
      <div className="section-heading">
        <span className="section-kicker">No. 06 — Stack</span>
        <h2>What's actually running under the hood.</h2>
        <p>
          An ordinary web app on the outside, and a retrieval engine written by
          hand in Python and C++ on the inside. No paid embeddings API, so
          citations stay honest and cheap to run.
        </p>
      </div>

      <div className="stk-tabs" role="group" aria-label="Filter the parts list">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`stk-tab${filter === f.id ? " active" : ""}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <span className="stk-count" aria-live="polite">
          {rows.length} parts, {langCount}{" "}
          {langCount === 1 ? "language" : "languages"}
        </span>
      </div>

      <div className="requisition-card stk-card">
        <div className="requisition-head">
          <span>STOCK REQUISITION FORM</span>
          <span>No. 0072</span>
        </div>

        <div className="stk-scroll">
          <table className="requisition-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Component</th>
                <th>Notes</th>
              </tr>
            </thead>
            {layers.map((layer) => (
              <tbody key={layer}>
                <tr className={`stk-group ${layer}`}>
                  <th colSpan={3} scope="colgroup">
                    {GROUPS[layer]}
                  </th>
                </tr>
                {rows
                  .filter((r) => r.layer === layer)
                  .map((item) => (
                    <tr key={item.role}>
                      <td>{item.role}</td>
                      <td>
                        {item.tech} <LangTag lang={item.lang} />
                      </td>
                      <td>{item.note}</td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>

        <div className="requisition-stamp">APPROVED</div>
      </div>

      <div className="stk-flow-wrap">
        <span className="design-block-label">Path of a question</span>
        <ol className="stk-flow">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="stk-flow-step">
              <span className="stk-flow-num">{i + 1}</span>
              <strong>{p.step}</strong>
              <LangTag lang={p.lang} />
              <p>{p.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
