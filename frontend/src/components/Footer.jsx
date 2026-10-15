import { useState } from "react";
import "../styles/Footer.css";
const LINKS = {
  Product: [
    ["Purpose", "#purpose"],
    ["Features", "#features"],
    ["Design", "#design"],
    ["Stack", "#stack"],
  ],
  For: [
    ["Students", "#for"],
    ["Study groups", "#for"],
    ["Educators", "#for"],
  ],
};

export default function Footer({ onEnter }) {
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="site-footer">
      <div className="footer-top">
        {}
        <div className="footer-brand footer-brand-card">
          <span className="catalog-hole" aria-hidden="true" />
          <span className="brand-mark">SC</span>
          <div>
            <span className="footer-brand-name">StudyCite</span>
            <p>A card catalog for your citations.</p>
            <span className="catalog-call">Call No. SC-2026</span>
          </div>
        </div>

        {Object.entries(LINKS).map(([title, items]) => (
          <nav className="footer-col" key={title} aria-label={title}>
            <span className="footer-col-title">{title}</span>
            {items.map(([label, href]) => (
              <a className="footer-link" href={href} key={label}>
                {label}
              </a>
            ))}
          </nav>
        ))}

        <div className="footer-col">
          <span className="footer-col-title">Get started</span>
          <span className="footer-status">
            <span className="footer-status-dot" aria-hidden="true" />
            Reading Room is open
          </span>
          <button className="footer-cta" onClick={onEnter}>
            Open the Reading Room →
          </button>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-text">
          <span>ICCT Colleges Foundation, Inc. — Project Proposal, 2026</span>
          <span>
            Built for research papers, thesis drafts, and exam review.
          </span>
        </div>
        <button
          className="footer-top-btn"
          onClick={toTop}
          aria-label="Back to top"
        >
          ↑ Back to top
        </button>
      </div>

      <div className="footer-stripe" aria-hidden="true" />
    </footer>
  );
}
