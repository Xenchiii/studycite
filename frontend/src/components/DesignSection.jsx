import { useEffect, useRef, useState } from "react";
import "../styles/design-section.css";

const SWATCHES = [
  { name: "Postal Blue", hex: "#1d3f7a" },
  { name: "Ledger Ink", hex: "#211d16" },
  { name: "Verified Green", hex: "#3f7d4a" },
  { name: "Caution Amber", hex: "#b8841c" },
  { name: "Card Stock", hex: "#faf3e2" },
];

const PRINCIPLES = [
  { title: "Traceable.", text: "Every claim carries a number you can click." },
  {
    title: "Honest verdicts.",
    text: "Verified, low-confidence, and weak matches never look the same.",
  },
  {
    title: "No dead ends.",
    text: "Every card, tab, and stamp does something when you touch it.",
  },
];

export default function DesignSection() {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copyHex = async (hex) => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      timer.current = setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <section
      className="design-section"
      id="design"
      aria-labelledby="design-heading"
    >
      <div className="section-heading">
        <span className="section-kicker">No. 05 — Design</span>
        <h2 id="design-heading">
          Built to look like a system of record, not a chatbot.
        </h2>
        <p>
          Every visual choice points back to the same idea: an answer is only as
          good as the paper trail behind it.
        </p>
      </div>

      <div className="design-grid">
        <div className="design-block">
          <h3 className="design-block-label">Palette</h3>
          <ul className="swatch-row">
            {SWATCHES.map((s) => (
              <li key={s.hex}>
                <button
                  type="button"
                  className="swatch"
                  onClick={() => copyHex(s.hex)}
                  aria-label={`Copy ${s.name}, ${s.hex}`}
                >
                  <span
                    className="swatch-chip"
                    style={{ background: s.hex }}
                    aria-hidden="true"
                  />
                  <span className="swatch-name">{s.name}</span>
                  <span className="swatch-hex">
                    {copied === s.hex ? "Copied ✓" : s.hex}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="design-block-hint">Click a swatch to copy its hex.</p>
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? `${copied} copied to clipboard` : ""}
          </span>
        </div>

        <div className="design-block">
          <h3 className="design-block-label">Type</h3>
          <figure className="type-specimen">
            <p className="type-specimen-display" aria-hidden="true">
              Aa Bb Cc 123
            </p>
            <figcaption className="type-specimen-caption">
              Special Elite — headings, stamps, labels
            </figcaption>
          </figure>
          <figure className="type-specimen">
            <p className="type-specimen-body">
              The quick brown fox jumps over the lazy dog.
            </p>
            <figcaption className="type-specimen-caption">
              Courier Prime — body copy, citations, excerpts
            </figcaption>
          </figure>
        </div>

        <div className="design-block">
          <h3 className="design-block-label">Principles</h3>
          <ul className="principle-list">
            {PRINCIPLES.map((p) => (
              <li key={p.title}>
                <strong>{p.title}</strong> {p.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
