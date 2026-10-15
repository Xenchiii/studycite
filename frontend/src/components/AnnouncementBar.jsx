import { useState } from "react";
import "../styles/announcement-bar.css";

const MESSAGES = [
  {
    icon: "bi-file-earmark-word",
    text: "DOCX citation-style detection is live",
  },
  { icon: "bi-patch-check", text: "Now checks APA, MLA, Chicago, and IEEE" },
  {
    icon: "bi-mortarboard",
    text: "Built for the ICCT Colleges Foundation proposal",
  },
];

const STORAGE_KEY = "studycite-announcement-dismissed";
const INTERVAL_MS = 4500;

const readDismissed = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(() => !readDismissed());
  const [closing, setClosing] = useState(false);
  const [index, setIndex] = useState(0);

  if (!visible) return null;

  const current = MESSAGES[index];
  const next = () => setIndex((i) => (i + 1) % MESSAGES.length);

  const dismiss = () => {
    setClosing(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      setClosing(true);
    }
    setTimeout(() => setVisible(false), 260);
  };

  return (
    <div
      className={`ab${closing ? " is-closing" : ""}`}
      role="region"
      aria-label="Announcements"
    >
      <div className="ab-inner">
        <span className="ab-tag">
          <i className="bi bi-megaphone" />
          <span>New</span>
        </span>

        <p className="ab-message" key={index}>
          <i className={`bi ${current.icon}`} />
          <span>{current.text}</span>
        </p>

        <div className="ab-dots">
          {MESSAGES.map((m, i) => (
            <button
              key={m.text}
              className={`ab-dot${i === index ? " is-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Show announcement ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>

        <button
          className="ab-close"
          onClick={dismiss}
          aria-label="Dismiss announcement"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>

      <span
        key={`progress-${index}`}
        className="ab-progress"
        style={{ "--ab-interval": `${INTERVAL_MS}ms` }}
        onAnimationEnd={next}
      />
    </div>
  );
}
