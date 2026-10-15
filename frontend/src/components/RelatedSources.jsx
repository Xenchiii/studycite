import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import "../styles/related-sources.css";

const GROUPS = [
  { kind: "scholarly", label: "Papers" },
  { kind: "encyclopedia", label: "Background" },
  { kind: "book", label: "Books" },
];

const BATCH = 6;

const meta = (it) =>
  [
    it.authors?.length ? it.authors.join(", ") : null,
    it.year,
    it.source,
    typeof it.citedBy === "number" && it.citedBy > 0
      ? `cited ${it.citedBy.toLocaleString()}×`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

export default function RelatedSources({ question, resetKey }) {
  const [status, setStatus] = useState("idle");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [partial, setPartial] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [shown, setShown] = useState(BATCH);
  const [error, setError] = useState(null);
  const token = useRef(0);

  useEffect(() => {
    token.current++;
    setStatus("idle");
    setItems([]);
    setPage(0);
    setHasMore(false);
    setPartial(false);
    setExhausted(false);
    setShown(BATCH);
    setError(null);
  }, [resetKey, question]);

  const load = async (nextPage) => {
    const t = ++token.current;
    setStatus("loading");
    setError(null);
    try {
      const result = await api.related(question, nextPage);
      if (t !== token.current) return;
      let added = 0;
      setItems((prev) => {
        const have = new Set(prev.map((p) => p.url));
        const fresh = result.items.filter((it) => !have.has(it.url));
        added = fresh.length;
        return [...prev, ...fresh];
      });
      setPage(nextPage);
      setPartial(Boolean(result.partial));
      setHasMore(Boolean(result.hasMore));

      setExhausted(nextPage > 1 && added === 0);
      if (nextPage > 1) setShown((n) => n + BATCH);
      setStatus("done");
    } catch (e) {
      if (t !== token.current) return;
      setError(e.message);
      setStatus("error");
    }
  };

  if (!question) return null;

  const ordered = GROUPS.flatMap(({ kind }) =>
    items.filter((it) => it.kind === kind),
  );
  const visible = ordered.slice(0, shown);
  const hiddenCount = ordered.length - visible.length;
  const canFetchMore = status === "done" && hasMore && !exhausted;

  return (
    <section className="rs" aria-label="Other sources to check">
      <h3 className="rs-title">More to read</h3>
      <p className="rs-hint">
        From outside your documents and not checked against the answer. Open and
        read before you cite.
      </p>

      {status === "idle" && (
        <button className="sp-link-btn rs-find" onClick={() => load(1)}>
          Find other sources
        </button>
      )}
      {status === "error" && (
        <button
          className="sp-link-btn rs-find"
          onClick={() => load(Math.max(1, page + 1))}
        >
          Try again
        </button>
      )}

      {status === "error" && (
        <div className="status-banner error" role="alert">
          {error}
        </div>
      )}

      {items.length > 0 && partial && (
        <p className="rs-note" role="status">
          One search source didn't respond, so this list may be incomplete.
        </p>
      )}

      {status === "done" && items.length === 0 && (
        <p className="empty-hint">
          Nothing turned up outside your documents for that question.
        </p>
      )}

      {GROUPS.map(({ kind, label }) => {
        const group = visible.filter((it) => it.kind === kind);
        if (group.length === 0) return null;
        return (
          <div key={kind} className="rs-group">
            <span className="rs-group-label">{label}</span>
            <ul className="rs-list">
              {group.map((it) => (
                <li className="rs-item" key={it.url}>
                  <a
                    className="rs-item-title"
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {it.title}
                    <i
                      className="bi bi-box-arrow-up-right"
                      aria-hidden="true"
                    />
                  </a>
                  <p className="rs-item-meta">{meta(it)}</p>
                  {it.snippet && (
                    <p className="rs-item-snippet">{it.snippet}</p>
                  )}
                  {it.freeUrl && (
                    <a
                      className="rs-item-free"
                      href={it.freeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Free full text
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {status === "loading" && items.length > 0 && (
        <p className="rs-note">Loading more…</p>
      )}
      {status === "loading" && items.length === 0 && (
        <p className="rs-note">Searching…</p>
      )}

      {status === "done" && hiddenCount > 0 && (
        <button
          className="sp-link-btn rs-find"
          onClick={() => setShown((n) => n + BATCH)}
        >
          Show {Math.min(BATCH, hiddenCount)} more ({hiddenCount} left)
        </button>
      )}
      {status === "done" && hiddenCount === 0 && canFetchMore && (
        <button className="sp-link-btn rs-find" onClick={() => load(page + 1)}>
          Find more sources
        </button>
      )}
      {status === "done" &&
        hiddenCount === 0 &&
        !canFetchMore &&
        items.length > 0 && (
          <p className="rs-note">That's everything found for this question.</p>
        )}
    </section>
  );
}
