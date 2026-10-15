import { useEffect, useRef, useState } from "react";
import "../styles/chat-panel.css";

const SUGGESTIONS = [
  "Summarize the main argument",
  "Which claims need a citation?",
  "List the key terms and definitions",
];

function renderWithCitations(text, onCite) {
  const pattern = /\[(\d+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const n = match[1];
    parts.push(
      <button
        type="button"
        key={`c${key++}`}
        className="cp-cite"
        aria-label={`Open source ${n}`}
        onClick={(e) => {
          e.stopPropagation();
          onCite(Number(n) - 1);
        }}
      >
        {n}
      </button>,
    );
    lastIndex = pattern.lastIndex;
  }

  parts.push(text.slice(lastIndex));
  return parts;
}

export default function ChatPanel({
  messages,
  onAsk,
  sending,
  onSelectMessage,
  activeMessageId,
  scopeLabel,
}) {
  const [question, setQuestion] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, sending]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [question]);

  const submit = (text = question) => {
    const q = text.trim();
    if (!q || sending) return;
    onAsk(q);
    setQuestion("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = !sending && question.trim().length > 0;

  return (
    <section className="cp">
      <header className="cp-header">
        <div className="cp-header-icon">
          <i className="bi bi-journal-text" />
        </div>
        <div className="cp-header-text">
          <h2>Reference Desk</h2>
          <p>
            <i className="bi bi-collection" />
            <span>{scopeLabel}</span>
          </p>
        </div>
      </header>

      <div className="cp-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="cp-empty">
            <i className="bi bi-search-heart" />
            <h3>Nothing on the desk yet</h3>
            <p>
              File a source on the left, then ask your question at the desk.
            </p>
            <div className="cp-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="cp-chip"
                  onClick={() => submit(s)}
                  disabled={sending}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isAssistant = m.role === "assistant";
          const isActive = isAssistant && m.id === activeMessageId;
          return (
            <div key={m.id} className={`cp-row ${m.role}`}>
              <div
                className={`cp-bubble${isActive ? " is-active" : ""}`}
                role={isAssistant ? "button" : undefined}
                tabIndex={isAssistant ? 0 : undefined}
                onClick={isAssistant ? () => onSelectMessage(m.id) : undefined}
                onKeyDown={
                  isAssistant
                    ? (e) => {
                        if (
                          e.target === e.currentTarget &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          onSelectMessage(m.id);
                        }
                      }
                    : undefined
                }
              >
                {isAssistant
                  ? renderWithCitations(m.content, (idx) =>
                      onSelectMessage(m.id, idx),
                    )
                  : m.content}
              </div>
              {isAssistant && m.mode && (
                <span className="cp-mode">
                  <i
                    className={`bi ${m.mode === "generated" ? "bi-pencil-square" : "bi-card-text"}`}
                  />
                  {m.mode === "generated"
                    ? "Desk clerk's summary"
                    : "Straight from the card"}
                </span>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="cp-row assistant">
            <div className="cp-bubble cp-typing" aria-live="polite">
              <span className="cp-dots">
                <span />
                <span />
                <span />
              </span>
              <span>Pulling the card…</span>
            </div>
          </div>
        )}
      </div>

      <div className="cp-composer">
        <div className="cp-composer-row">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="What would you like to look up?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Your question"
          />
          <button
            type="button"
            className="cp-send"
            onClick={() => submit()}
            disabled={!canSend}
          >
            <span>Submit slip</span>
            <i
              className={`bi ${sending ? "bi-arrow-repeat cp-spin" : "bi-send"}`}
            />
          </button>
        </div>
        <p className="cp-hint">
          Enter to submit &middot; Shift + Enter for a new line
        </p>
      </div>
    </section>
  );
}
