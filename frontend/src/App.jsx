import { useEffect, useState, useCallback, useRef } from "react";
import Landing from "./components/Landing.jsx";
import AuthPage from "./components/AuthPage.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import SourcePanel from "./components/SourcePanel.jsx";
import RelatedSources from "./components/RelatedSources.jsx";
import { api } from "./api.js";
import { useAuth } from "./AuthContext.jsx";
import "./styles/authpage.css";

const THEME_KEY = "theme";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function App() {
  const { user, loading, login, register, guest, logout } = useAuth();
  const entered = !!user;

  const [view, setView] = useState("landing");
  const [authMode, setAuthMode] = useState("login");

  const [theme, setTheme] = useState(getInitialTheme);
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [error, setError] = useState(null);

  const sessionToken = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, entered]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const openAuth = (mode) => {
    setAuthMode(mode);
    setView("auth");
  };

  const guarded =
    (fn) =>
    async (...args) => {
      try {
        setError(null);
        await fn(...args);
      } catch (e) {
        setError(e.message);
      }
    };

  const refreshDocuments = useCallback(async () => {
    const docs = await api.listDocuments();
    setDocuments(docs);
    setSelectedDocIds((ids) =>
      ids.filter((id) => docs.some((d) => d.id === id)),
    );
  }, []);

  const refreshSessions = useCallback(
    async () => setSessions(await api.listSessions()),
    [],
  );

  const loadSession = useCallback(async (id) => {
    const token = ++sessionToken.current;
    setSessionId(id);
    setActiveMessageId(null);
    setMessages([]);
    const msgs = await api.getMessages(id);
    if (token !== sessionToken.current) return;
    setMessages(msgs);
    const lastAssistant = [...msgs]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistant) setActiveMessageId(lastAssistant.id);
  }, []);

  const startSession = useCallback(async () => {
    const session = await api.createSession("Study session");
    await refreshSessions();
    await loadSession(session.id);
  }, [loadSession, refreshSessions]);

  useEffect(() => {
    if (!entered) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [, existing] = await Promise.all([
          refreshDocuments(),
          api.listSessions(),
        ]);
        if (cancelled) return;
        setSessions(existing);
        if (existing.length > 0) await loadSession(existing[0].id);
        else await startSession();
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entered, user?.id, refreshDocuments, loadSession, startSession]);

  const handleUpload = guarded(async (file) => {
    setUploading(true);
    try {
      const doc = await api.uploadDocument(file);
      await refreshDocuments();
      setSelectedDocIds((ids) =>
        ids.includes(doc.id) ? ids : [...ids, doc.id],
      );
    } finally {
      setUploading(false);
    }
  });

  const handleDeleteDocument = guarded(async (id) => {
    await api.deleteDocument(id);
    await refreshDocuments();
  });

  const handleSelectSession = guarded(async (id) => {
    if (id !== sessionId) await loadSession(id);
  });

  const handleNewSession = guarded(startSession);

  const handleDeleteSession = guarded(async (id) => {
    await api.deleteSession(id);
    const remaining = await api.listSessions();
    setSessions(remaining);
    if (id === sessionId) {
      if (remaining.length > 0) await loadSession(remaining[0].id);
      else await startSession();
    }
  });

  const toggleDoc = (id) =>
    setSelectedDocIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  const handleAsk = async (question) => {
    if (!sessionId || sending) return;
    const token = sessionToken.current;
    setSending(true);
    setError(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}`,
        pending: true,
        role: "user",
        content: question,
      },
    ]);
    try {
      const result = await api.ask(sessionId, question, selectedDocIds);
      refreshSessions().catch(() => {});
      if (token !== sessionToken.current) return;
      setMessages((prev) => [
        ...prev.filter((m) => !m.pending),
        result.userMessage,
        result.assistantMessage,
      ]);
      setActiveMessageId(result.assistantMessage.id);
    } catch (e) {
      if (token === sessionToken.current) {
        setError(e.message);
        setMessages((prev) => prev.filter((m) => !m.pending));
      }
    } finally {
      setSending(false);
    }
  };

  const handleSelectMessage = (id, citeIndex) => {
    setActiveMessageId(id);
    if (typeof citeIndex === "number") {
      requestAnimationFrame(() => {
        document
          .getElementById(`cite-${citeIndex}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  };

  const handleExit = async () => {
    try {
      await logout();
    } finally {
      sessionToken.current++;
      setDocuments([]);
      setSelectedDocIds([]);
      setSessions([]);
      setSessionId(null);
      setMessages([]);
      setActiveMessageId(null);
      setError(null);
      setView("landing");
    }
  };

  const activeMessage = messages.find(
    (m) => m.id === activeMessageId && m.role === "assistant",
  );

  const activeIdx = messages.findIndex(
    (m) => m.id === activeMessageId && m.role === "assistant",
  );
  const activeQuestion =
    activeIdx > 0 && messages[activeIdx - 1].role === "user"
      ? messages[activeIdx - 1].content
      : null;

  let scopeLabel;
  if (selectedDocIds.length > 0) {
    scopeLabel = `Searching ${selectedDocIds.length} selected document${selectedDocIds.length > 1 ? "s" : ""}`;
  } else if (documents.length > 0) {
    scopeLabel = "Searching across all uploaded documents";
  } else {
    scopeLabel = "No documents uploaded yet";
  }

  if (loading) return null;

  if (!user) {
    if (view === "auth") {
      return (
        <AuthPage
          key={authMode}
          initialMode={authMode}
          onBack={() => setView("landing")}
          onGuest={() => guest()}
          onSubmit={async ({ mode, name, email, password, remember }) => {
            if (mode === "register") await register(name, email, password);
            else await login(email, password, remember);
          }}
        />
      );
    }
    return (
      <Landing
        onLogin={() => openAuth("login")}
        onRegister={() => openAuth("register")}
        onTry={() => guest()}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-wrap">
      <div className="top-stripe" />
      <div className="app-shell">
        <Sidebar
          documents={documents}
          selectedDocIds={selectedDocIds}
          onToggleDoc={toggleDoc}
          onUpload={handleUpload}
          onDelete={handleDeleteDocument}
          uploading={uploading}
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onExit={handleExit}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <ChatPanel
          messages={messages}
          onAsk={handleAsk}
          sending={sending}
          onSelectMessage={handleSelectMessage}
          activeMessageId={activeMessageId}
          scopeLabel={scopeLabel}
        />
        <SourcePanel citations={activeMessage?.citations} error={error}>
          <RelatedSources
            question={activeQuestion}
            resetKey={activeMessageId}
          />
        </SourcePanel>
      </div>
    </div>
  );
}
