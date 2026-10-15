import { useRef, useState } from "react";
import "../styles/sidebar.css";

const fileIcon = (name = "") => {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return "bi-file-earmark-pdf";
  if (ext === "docx") return "bi-file-earmark-word";
  return "bi-file-earmark-text";
};

export default function Sidebar({
  documents,
  selectedDocIds,
  onToggleDoc,
  onUpload,
  onDelete,
  uploading,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onExit,
  theme,
  onToggleTheme,
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => files?.[0] && onUpload(files[0]);
  const openPicker = () => !uploading && inputRef.current?.click();

  const onDropzoneKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <aside className="sidebar">
      <header className="sb-brand">
        <div className="sb-brand-left">
          <span className="sb-brand-mark">SC</span>
          <h1 className="sb-brand-name">StudyCite</h1>
        </div>
        <button
          className="sb-icon-btn"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          <i
            className={`bi ${theme === "dark" ? "bi-sun" : "bi-moon-stars"}`}
          />
        </button>
      </header>

      <button className="sb-exit" onClick={onExit}>
        <i className="bi bi-arrow-left" />
        <span>Back to front desk</span>
      </button>

      <div className="sb-scroll">
        <section className="sb-section">
          <div className="sb-heading">
            <h2>Card Catalog</h2>
            {documents.length > 0 && (
              <span className="sb-count">
                {selectedDocIds.length}/{documents.length} active
              </span>
            )}
          </div>

          <div
            className={`sb-dropzone${dragging ? " is-dragging" : ""}${uploading ? " is-uploading" : ""}`}
            role="button"
            tabIndex={0}
            onClick={openPicker}
            onKeyDown={onDropzoneKey}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <i
              className={`bi ${uploading ? "bi-arrow-repeat sb-spin" : "bi-cloud-arrow-up"}`}
            />
            <div className="sb-dropzone-text">
              <strong>
                {uploading
                  ? "Filing your source…"
                  : "Drop a file or click to browse"}
              </strong>
              <span>PDF, DOCX, TXT or MD</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {documents.length === 0 ? (
            <div className="sb-empty">
              <i className="bi bi-journal-bookmark" />
              <p>The drawer's empty. File the sources you cited.</p>
            </div>
          ) : (
            <ul className="sb-list">
              {documents.map((doc) => {
                const checked = selectedDocIds.includes(doc.id);
                return (
                  <li
                    className={`sb-doc${checked ? " is-selected" : ""}`}
                    key={doc.id}
                  >
                    <label className="sb-doc-main">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleDoc(doc.id)}
                      />
                      <span className="sb-check">
                        <i className="bi bi-check-lg" />
                      </span>
                      <i
                        className={`bi ${fileIcon(doc.original_name)} sb-doc-icon`}
                      />
                      <span className="sb-doc-text">
                        <span className="sb-doc-name" title={doc.original_name}>
                          {doc.original_name}
                        </span>
                        <span className="sb-doc-meta">
                          {doc.chunk_count} chunks
                        </span>
                      </span>
                    </label>
                    <button
                      className="sb-icon-btn sb-danger"
                      onClick={() => onDelete(doc.id)}
                      aria-label={`Remove ${doc.original_name}`}
                      title="Remove"
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="sb-section">
          <div className="sb-heading">
            <h2>Reading Room</h2>
            {sessions.length > 0 && (
              <span className="sb-count">{sessions.length}</span>
            )}
          </div>

          <button className="sb-new" onClick={onNewSession}>
            <i className="bi bi-plus-lg" />
            <span>New session slip</span>
          </button>

          {sessions.length > 0 && (
            <ul className="sb-list">
              {sessions.map((s) => (
                <li
                  className={`sb-session${s.id === activeSessionId ? " is-active" : ""}`}
                  key={s.id}
                >
                  <button
                    className="sb-session-main"
                    onClick={() => onSelectSession(s.id)}
                  >
                    <i className="bi bi-chat-left-text" />
                    <span className="sb-session-title">{s.title}</span>
                  </button>
                  <button
                    className="sb-icon-btn sb-danger"
                    onClick={() => onDeleteSession(s.id)}
                    aria-label={`Delete ${s.title}`}
                    title="Delete"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
