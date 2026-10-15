import { useState } from "react";
import "../styles/FeatureCards.css";
const FilesDemo = () => (
  <div className="mini mini-files">
    {[
      { name: "ch3_photosynthesis.pdf", pages: "12 pp", pct: 100 },
      { name: "lecture_notes.docx", pages: "7 pp", pct: 100 },
      { name: "journal_article.pdf", pages: "24 pp", pct: 62 },
    ].map((f, k) => (
      <div className="mini-file" key={f.name} style={{ "--k": k }}>
        <div className="mini-file-row">
          <span className="mini-file-name">{f.name}</span>
          <span className="mini-file-meta">{f.pages}</span>
        </div>
        <div className="mini-bar">
          <span style={{ "--w": `${f.pct}%` }} />
        </div>
      </div>
    ))}
    <span className="mini-caption">Chunking into passages…</span>
  </div>
);

const AskDemo = () => (
  <div className="mini mini-ask">
    <div className="mini-q">Where does photosynthesis happen?</div>
    <p className="mini-a">
      It takes place in the chloroplasts of plant cells
      <span className="cite-tag">1</span>, where chlorophyll absorbs light
      <span className="cite-tag">2</span>.
    </p>
    <div className="mini-src">
      <span className="mini-src-page">p. 14</span>
      “…the chloroplast is the site of light-dependent reactions…”
    </div>
  </div>
);

const ReceiptDemo = () => (
  <div className="mini mini-receipt">
    {[
      { cls: "high", label: "Verified", note: "Direct match" },
      { cls: "mid", label: "Low confidence", note: "Partial overlap" },
      { cls: "low", label: "Weak match", note: "Check the source" },
    ].map((v, k) => (
      <div className="mini-verdict" key={v.label} style={{ "--k": k }}>
        <span className={`score-pill ${v.cls}`}>{v.label}</span>
        <span className="mini-verdict-note">{v.note}</span>
      </div>
    ))}
  </div>
);

const CARDS = [
  {
    number: "No. 01",
    title: "File your sources",
    front:
      "Upload the PDFs, chapters, or notes you cited. StudyCite checks your questions against those documents, not the open internet.",
    back: "Drag in up to five files per session. Each one is chunked into passages the moment it lands, so it's searchable within seconds — no separate indexing step to wait on.",
    tags: ["PDF", "DOCX", "TXT"],
    Demo: FilesDemo,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5" />
        <path d="M8 13h8M8 16.5h8M8 9.5h3" />
      </svg>
    ),
  },
  {
    number: "No. 02",
    title: "Ask at the desk",
    front:
      "Ask a question about your material and get an answer traced back to a specific passage — never a guess dressed up as fact.",
    back: "Every sentence in the answer carries a number. Click it and the exact excerpt slides into view on the right — no digging through the PDF yourself.",
    tags: ["Cited", "Traceable"],
    Demo: AskDemo,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M19.5 19.5 15 15" />
      </svg>
    ),
  },
  {
    number: "No. 03",
    title: "Take the receipt",
    front:
      "Every answer comes stamped with a match verdict, so you know at a glance whether you're standing on solid ground or shaky.",
    back: "Verified, low-confidence, and weak match each render differently on purpose — you shouldn't have to read the fine print to know which is which.",
    tags: ["3 verdicts", "At a glance"],
    Demo: ReceiptDemo,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="1"
          transform="rotate(-6 12 12)"
        />
        <path d="m9 13 2 2 4.5-4.5" transform="rotate(-6 12 12)" />
      </svg>
    ),
  },
];

export default function FeatureCards() {
  const [flipped, setFlipped] = useState({});
  const toggle = (i) => setFlipped((f) => ({ ...f, [i]: !f[i] }));

  const onKeyDown = (e, i) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(i);
    }
  };

  return (
    <>
      {CARDS.map((c, i) => {
        const isFlipped = !!flipped[i];
        const { Demo } = c;
        return (
          <div
            className="flip-card"
            key={c.number}
            role="button"
            tabIndex={0}
            aria-pressed={isFlipped}
            aria-label={`${c.title}. ${isFlipped ? "Showing how it works. Press to flip back." : "Press to see how it works."}`}
            style={{ "--i": i }}
            onClick={() => toggle(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <div className={`flip-card-inner${isFlipped ? " flipped" : ""}`}>
              {}
              <div className="feature-card flip-front" aria-hidden={isFlipped}>
                <span className="feature-number">{c.number}</span>
                <span className="feature-icon-stamp">{c.icon}</span>
                <h3>{c.title}</h3>
                <p>{c.front}</p>
                <div className="tag-row">
                  {c.tags.map((t) => (
                    <span className="mini-tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flip-foot">
                  <span className="flip-hint">See how it works</span>
                  <span className="flip-step">
                    {i + 1}/{CARDS.length}
                  </span>
                </div>
              </div>

              {}
              <div className="feature-card flip-back" aria-hidden={!isFlipped}>
                <span className="feature-number">{c.number}</span>
                <span className="flip-kicker">Carbon copy</span>
                <h3>In practice</h3>
                <p>{c.back}</p>
                {isFlipped && <Demo />}
                <div className="flip-foot">
                  <span className="flip-hint">Flip back</span>
                  <span className="flip-step">
                    {i + 1}/{CARDS.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
