import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/SourcePanel.css";
import "../styles/source-panel-tidy.css";

const HIGH = 0.35;
const MID = 0.15;
const LONG_EXCERPT = 240;

const clamp01 = (n) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

function scoreTier(score) {
  if (score >= HIGH) return "high";
  if (score >= MID) return "mid";
  return "low";
}

function stampLabel(tier) {
  if (tier === "high") return "VERIFIED";
  if (tier === "mid") return "LOW CONFIDENCE";
  return "WEAK MATCH";
}

const TIER_NAME = {
  high: "Verified",
  mid: "Low confidence",
  low: "Weak match",
};

export default function SourcePanel({
  citations,
  error,
  loading = false,
  activeIndex = null,
  children,
}) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("order");
  const [expanded, setExpanded] = useState(() => new Set());
  const [copied, setCopied] = useState(null);
  const cardRefs = useRef({});

  const items = useMemo(
    () =>
      (citations || []).map((c, i) => {
        const score = clamp01(c.score);
        return { c, i, score, tier: scoreTier(score) };
      }),
    [citations],
  );

  const counts = useMemo(() => {
    const t = { high: 0, mid: 0, low: 0 };
    items.forEach((it) => t[it.tier]++);
    return t;
  }, [items]);

  const avg = items.length
    ? items.reduce((s, it) => s + it.score, 0) / items.length
    : 0;
  const allWeak = items.length > 0 && counts.high === 0;
  const tiersPresent = ["high", "mid", "low"].filter(
    (t) => counts[t] > 0,
  ).length;

  const visible = useMemo(() => {
    const list =
      filter === "all" ? items : items.filter((it) => it.tier === filter);
    return sort === "score"
      ? [...list].sort((a, b) => b.score - a.score)
      : list;
  }, [items, filter, sort]);

  useEffect(() => {
    setFilter("all");
    setSort("order");
    setExpanded(new Set());
  }, [citations]);

  useEffect(() => {
    if (activeIndex == null || !items[activeIndex]) return;
    setFilter("all");
    setExpanded((prev) => new Set(prev).add(activeIndex));
    const id = requestAnimationFrame(() => {
      const el = cardRefs.current[activeIndex];
      if (!el) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [activeIndex, items]);

  const toggleExpanded = (i) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const copyCitation = async (it) => {
    const passage = Number.isFinite(it.c.chunkIndex)
      ? `, passage ${it.c.chunkIndex + 1}`
      : "";
    const text = `"${it.c.excerpt}" (${it.c.documentName}${passage})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(it.i);
      setTimeout(() => setCopied((cur) => (cur === it.i ? null : cur)), 1600);
    } catch {
      /* clipboard blocked (e.g. insecure context); fail silently */
    }
  };

  const hasCitations = items.length > 0;

  return (
    <aside className="source-panel" aria-label="Sources" aria-busy={loading}>
      <h2>Vertical File</h2>
      <p className="hint">
        Every citation traces back to the actual excerpt. Click a number in the
        chat to pull the card.
      </p>

      {error && (
        <div className="status-banner error" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="sp-skeletons" aria-hidden="true">
          <div className="sp-skeleton" />
          <div className="sp-skeleton" />
        </div>
      )}

      {!loading && !hasCitations && !error && (
        <p className="empty-hint">
          Ask a question about your documents and the supporting cards will show
          up here.
        </p>
      )}

      {!loading && hasCitations && (
        <>
          <div className="sp-summary">
            <div className="sp-summary-top">
              <strong>
                {items.length} {items.length === 1 ? "source" : "sources"}
              </strong>
              <span>avg match {Math.round(avg * 100)}%</span>
            </div>
            <div
              className="sp-bar"
              role="img"
              aria-label={`${counts.high} verified, ${counts.mid} low confidence, ${counts.low} weak`}
            >
              {["high", "mid", "low"].map(
                (t) =>
                  counts[t] > 0 && (
                    <span
                      key={t}
                      className={`sp-bar-seg ${t}`}
                      style={{ flex: counts[t] }}
                    />
                  ),
              )}
            </div>
          </div>

          {allWeak && (
            <div className="status-banner sp-warn" role="status">
              None of these matches are strong. Treat the answer with caution
              and check your documents directly.
            </div>
          )}

          {(tiersPresent > 1 || items.length > 3) && (
            <div className="sp-toolbar">
              {tiersPresent > 1 && (
                <div
                  className="sp-chips"
                  role="group"
                  aria-label="Filter by confidence"
                >
                  <button
                    className={`sp-chip${filter === "all" ? " active" : ""}`}
                    onClick={() => setFilter("all")}
                    aria-pressed={filter === "all"}
                  >
                    All {items.length}
                  </button>
                  {["high", "mid", "low"].map(
                    (t) =>
                      counts[t] > 0 && (
                        <button
                          key={t}
                          className={`sp-chip ${t}${filter === t ? " active" : ""}`}
                          onClick={() => setFilter(filter === t ? "all" : t)}
                          aria-pressed={filter === t}
                        >
                          {TIER_NAME[t]} {counts[t]}
                        </button>
                      ),
                  )}
                </div>
              )}
              {items.length > 3 && (
                <label className="sp-sort">
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="order">Citation order</option>
                    <option value="score">Best match first</option>
                  </select>
                </label>
              )}
            </div>
          )}

          {visible.map((it) => {
            const { c, i, score, tier } = it;
            const isLong = (c.excerpt || "").length > LONG_EXCERPT;
            const open = expanded.has(i);
            const pct = Math.round(score * 100);
            return (
              <article
                className={`citation-card${activeIndex === i ? " active" : ""}`}
                key={`${c.documentId}-${c.chunkIndex}-${i}`}
                id={`cite-${i}`}
                ref={(el) => {
                  if (el) cardRefs.current[i] = el;
                  else delete cardRefs.current[i];
                }}
              >
                <div className="citation-card-head">
                  <span className="doc-name">
                    [{i + 1}] {c.documentName}
                  </span>
                  <span className={`score-pill ${tier}`}>
                    {stampLabel(tier)} · {pct}%
                  </span>
                </div>

                <p
                  className={`citation-excerpt${isLong && !open ? " clamped" : ""}`}
                >
                  {c.excerpt}
                </p>

                <div className="sp-card-actions">
                  {Number.isFinite(c.chunkIndex) && (
                    <span className="sp-passage">
                      Passage {c.chunkIndex + 1}
                    </span>
                  )}
                  {isLong && (
                    <button
                      className="sp-link-btn"
                      onClick={() => toggleExpanded(i)}
                      aria-expanded={open}
                    >
                      {open ? "Show less" : "Show more"}
                    </button>
                  )}
                  <button
                    className="sp-link-btn"
                    onClick={() => copyCitation(it)}
                  >
                    {copied === i ? "Copied" : "Copy quote"}
                  </button>
                </div>
              </article>
            );
          })}

          {visible.length === 0 && (
            <p className="empty-hint">
              No sources at this confidence level.{" "}
              <button className="sp-link-btn" onClick={() => setFilter("all")}>
                Show all
              </button>
            </p>
          )}
        </>
      )}

      {children}
    </aside>
  );
}
