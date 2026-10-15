import { useEffect, useRef, useState } from "react";
import "../styles/LiveDemoSection.css";

const LIBRARY = [
  {
    doc: "Physical_Chemistry_Notes.pdf",
    page: "p. 118",
    text: "For an isolated system, entropy will increase until equilibrium is reached, the point of maximum probability. Energy naturally spreads toward the most probable arrangement of particles, which is why the process is treated as irreversible in classical thermodynamics.",
  },
  {
    doc: "Research_Methods_Ch2.pdf",
    page: "p. 31",
    text: "Qualitative research prioritizes depth over breadth, using interviews and open coding to surface themes. Quantitative research prioritizes breadth, using structured instruments and statistical inference to test a hypothesis across a sample.",
  },
  {
    doc: "World_History_Unit4.pdf",
    page: "p. 204",
    text: "The outbreak of the First World War is usually traced to a tangle of alliance systems, militarism, and nationalism, with the assassination of Archduke Franz Ferdinand acting as the immediate trigger rather than the root cause.",
  },
];

const EXAMPLES = [
  "Why does entropy increase in an isolated system?",
  "What's the difference between qualitative and quantitative research?",
  "What caused World War I?",
];

const STAGES = [
  "Searching passages…",
  "Matching key terms…",
  "Checking against sources…",
];

const VERDICTS = {
  high: { cls: "high", label: "Verified" },
  mid: { cls: "mid", label: "Low confidence" },
  low: { cls: "low", label: "Weak match" },
};

const STOPWORDS = new Set(
  "a an the and or but if of to in on for with is are was were be been this that these those it its as at by from into over under than so what why how does did when which who between about there their".split(
    " ",
  ),
);

const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s|e)$/, "") : w);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

/** The single sentence in a passage that covers the most question terms. */
function bestSentence(text, qStems) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let best = sentences[0];
  let bestScore = -1;
  for (const s of sentences) {
    const stems = new Set(tokenize(s));
    const score = [...qStems].filter((t) => stems.has(t)).length;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

function findMatches(question) {
  const qStems = new Set(tokenize(question));
  if (qStems.size === 0) return { hits: [], qStems };

  const hits = LIBRARY.map((entry) => {
    const cStems = new Set(tokenize(entry.text));
    const matched = [...qStems].filter((t) => cStems.has(t)).length;
    const coverage = matched / qStems.size;
    // one shared term isn't enough to call anything verified
    const verdict =
      matched >= 2 && coverage >= 0.6
        ? "high"
        : matched >= 2 && coverage >= 0.4
          ? "mid"
          : "low";
    return {
      ...entry,
      matched,
      total: qStems.size,
      coverage,
      verdict,
      sentence: bestSentence(entry.text, qStems),
    };
  })
    .filter((h) => h.matched > 0 && h.coverage >= 0.25)
    .sort((a, b) => b.coverage - a.coverage || b.matched - a.matched)
    .slice(0, 2);

  return { hits, qStems };
}

function Highlighted({ text, stems }) {
  return text.split(/([A-Za-z0-9]+)/).map((part, i) =>
    /^[A-Za-z0-9]+$/.test(part) &&
    part.length > 2 &&
    stems.has(stem(part.toLowerCase())) ? (
      <mark className="hit" key={i}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function LiveDemoSection() {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const run = (q) => {
    const text = (q ?? question).trim();
    if (!text) return;
    clearTimers(); // a new question cancels any run still in flight
    setQuestion(text);
    setAsking(true);
    setResult(null);
    setStep(0);

    timers.current = [
      setTimeout(() => setStep(1), 230),
      setTimeout(() => setStep(2), 460),
      setTimeout(() => {
        setResult({ ...findMatches(text), q: text });
        setActiveIdx(0);
        setAsking(false);
      }, 720),
    ];
  };

  const reset = () => {
    clearTimers();
    setQuestion("");
    setResult(null);
    setAsking(false);
  };

  const active = result?.hits[activeIdx];

  return (
    <section className="live-demo-section" id="live-demo">
      <div className="section-heading">
        <span className="section-kicker">No. 04 — Try it now</span>
        <h2>A tiny sample library — ask it something.</h2>
        <p>
          This runs entirely in your browser against three sample pages, just to
          show the shape of a real answer. Upload your own sources once you're
          inside.
        </p>
      </div>

      <div className="live-demo-card">
        {}
        <div className="demo-drawer">
          <span className="demo-drawer-label">
            Sample library · {LIBRARY.length} documents
          </span>
          <div className="demo-spines">
            {LIBRARY.map((d) => {
              const idx = result
                ? result.hits.findIndex((h) => h.doc === d.doc)
                : -1;
              return (
                <button
                  type="button"
                  key={d.doc}
                  className={`demo-spine${idx >= 0 ? " is-hit" : ""}${idx >= 0 && idx === activeIdx ? " is-active" : ""}`}
                  onClick={() => idx >= 0 && setActiveIdx(idx)}
                  disabled={idx < 0}
                  title={
                    idx >= 0 ? "Show this source" : "Not used for this answer"
                  }
                >
                  {d.doc}
                  {idx >= 0 && <span className="cite-tag">{idx + 1}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="live-demo-examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="live-demo-chip"
              onClick={() => run(ex)}
            >
              {ex}
            </button>
          ))}
        </div>

        <form
          className="live-demo-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="demo-input-wrap">
            <input
              className="live-demo-input"
              value={question}
              aria-label="Your question"
              placeholder="Or type your own question about entropy, research methods, or WWI…"
              onChange={(e) => setQuestion(e.target.value)}
            />
            {question && (
              <button
                type="button"
                className="demo-clear"
                onClick={reset}
                aria-label="Clear question"
              >
                ×
              </button>
            )}
          </div>
          <button
            className="live-demo-ask"
            type="submit"
            disabled={asking || !question.trim()}
          >
            {asking ? "Checking…" : "Ask"}
          </button>
        </form>

        {asking && (
          <div className="demo-progress" role="status">
            <div className="demo-progress-bar">
              <span style={{ width: `${(step + 1) * 33.4}%` }} />
            </div>
            <span className="demo-progress-text">{STAGES[step]}</span>
          </div>
        )}

        <div aria-live="polite">
          {result && (
            <div className="live-demo-result">
              {result.hits.length === 0 ? (
                <p className="empty-hint">
                  Nothing in this sample library overlaps with that — try one of
                  the examples above. (A real library would be your own files.)
                </p>
              ) : (
                <>
                  <div className="demo-answer-head">
                    <span className="mode-tag">Answer</span>
                    <span className="demo-answer-note">
                      Built only from the passages below — nothing added.
                    </span>
                  </div>

                  <div className="live-demo-answer">
                    {result.hits.map((h, i) => (
                      <p key={h.doc} className="demo-answer-line">
                        <Highlighted
                          text={h.sentence}
                          stems={new Set(tokenize(result.q))}
                        />
                        <button
                          type="button"
                          className="cite-tag"
                          onClick={() => setActiveIdx(i)}
                          aria-label={`Show source ${i + 1}: ${h.doc}`}
                        >
                          {i + 1}
                        </button>
                      </p>
                    ))}
                  </div>

                  <div className="live-demo-source-tabs" role="tablist">
                    {result.hits.map((h, i) => (
                      <button
                        key={h.doc}
                        role="tab"
                        aria-selected={i === activeIdx}
                        className={`live-demo-tab${i === activeIdx ? " active" : ""}`}
                        onClick={() => setActiveIdx(i)}
                      >
                        [{i + 1}] {h.doc}
                      </button>
                    ))}
                  </div>

                  <div className="citation-card demo-citation" key={active.doc}>
                    <div className="citation-card-head">
                      <span className="doc-name">{active.doc}</span>
                      <span
                        className={`score-pill ${VERDICTS[active.verdict].cls}`}
                      >
                        {VERDICTS[active.verdict].label} · {active.page}
                      </span>
                    </div>
                    <p className="citation-excerpt">
                      “
                      <Highlighted
                        text={active.text}
                        stems={new Set(tokenize(result.q))}
                      />
                      ”
                    </p>
                    <div className="demo-match-meter">
                      <span className="demo-match-label">
                        {active.matched} of {active.total} key terms matched
                      </span>
                      <span className="demo-match-track" aria-hidden="true">
                        <span
                          className={`demo-match-fill ${VERDICTS[active.verdict].cls}`}
                          style={{
                            width: `${Math.round(active.coverage * 100)}%`,
                          }}
                        />
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
