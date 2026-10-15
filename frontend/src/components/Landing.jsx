import { useEffect, useRef, useState } from "react";
import AnnouncementBar from "./AnnouncementBar.jsx";
import Navbar from "./Navbar.jsx";
import ScrollAccessories from "./ScrollAccessories.jsx";
import DemoMockup from "./DemoMockup.jsx";
import CitationStyleSwitcher from "./CitationStyleSwitcher.jsx";
import LiveDemoSection from "./LiveDemoSection.jsx";
import DesignSection from "./DesignSection.jsx";
import StackSection from "./StackSection.jsx";
import ComparisonSection from "./ComparisonSection.jsx";
import TestimonialsSection from "./TestimonialsSection.jsx";
import PricingSection from "./PricingSection.jsx";
import ForSection from "./ForSection.jsx";
import FeatureCards from "./FeatureCards.jsx";
import QuizSection from "./QuizSection.jsx";
import FaqSection from "./FaqSection.jsx";
import CtaBanner from "./CtaBanner.jsx";
import Footer from "./Footer.jsx";
import "../styles/Landing.css";
import "../styles/mobile-fix.css";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${shown ? " in" : ""} ${className}`}
      style={{ "--d": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CountUp({ to, duration = 800 }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      setN(to);
      return;
    }
    let raf;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return <span ref={ref}>{n}</span>;
}

const TICKER_ITEMS = [
  "APA",
  "MLA",
  "Chicago",
  "IEEE",
  "PDF",
  "DOCX",
  "TXT",
  "Web & mobile",
  "Answers grounded in your own materials",
  "Every claim, a numbered source",
];

const PIPELINE = [
  {
    n: "01",
    title: "Chunk",
    body: "Your files are split into passages the moment they land, so they're searchable within seconds.",
  },
  {
    n: "02",
    title: "Retrieve",
    body: "Only passages from your own materials are pulled in for the question, never the open internet.",
  },
  {
    n: "03",
    title: "Answer",
    body: "The explanation is written from those passages, with every sentence carrying a source number.",
  },
  {
    n: "04",
    title: "Verify",
    body: "Each claim is matched back to its excerpt and stamped with a verdict before it reaches you.",
  },
];

const BADGES = [
  "No signup to try it",
  "PDF · DOCX · TXT",
  "Runs fully offline",
];

export default function Landing({
  onLogin,
  onRegister,
  onTry,
  onEnter,
  theme,
  onToggleTheme,
}) {
  const goLogin = onLogin || onEnter;
  const goRegister = onRegister || onEnter;
  const goTry = onTry || goRegister;

  return (
    <div className="landing">
      <a className="skip-link" href="#purpose">
        Skip to content
      </a>

      <ScrollAccessories />
      <AnnouncementBar />
      <div className="top-stripe" />
      <Navbar
        onLogin={goLogin}
        onRegister={goRegister}
        onTry={goTry}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {}
      <section className="hero" id="purpose">
        <div className="hero-copy">
          <p className="hero-quote">
            “ ICCT COLLEGES FOUNDATION, INC. — PROJECT PROPOSAL
          </p>
          <h1 className="hero-title">
            Every answer, <em>traceable</em> back to the page it came from.
          </h1>
          <p className="hero-body">
            StudyCite is an AI study assistant that never asks you to take an
            answer on faith. Ask a question, get an explanation, and check
            exactly where it came from
            <span className="cite-tag">1</span> — before a claim ever reaches
            you, it's already been checked against the source
            <span className="cite-tag">2</span>.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="hero-cta-primary"
              onClick={goRegister}
            >
              Start studying free
            </button>
            <a className="hero-cta-secondary" href="#features">
              Explore the features
            </a>
          </div>
          <div className="hero-badges">
            {BADGES.map((b) => (
              <span key={b}>
                <i aria-hidden="true">✓</i> {b}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <span className="hero-tape" aria-hidden="true" />
          <DemoMockup />
          <span className="hero-stamp" aria-hidden="true">
            Verified ✓
          </span>
        </div>
      </section>

      <div className="hero-divider" />

      {}
      <Reveal className="reveal-wide">
        <section className="stats-row">
          <div className="stat">
            <strong>
              <CountUp to={4} />
            </strong>
            <span>Citation styles</span>
            <span className="stat-sub">APA · MLA · Chicago · IEEE</span>
          </div>
          <div className="stat">
            <strong>
              <CountUp to={2} />
            </strong>
            <span>Platforms</span>
            <span className="stat-sub">Web &amp; mobile</span>
          </div>
          <div className="stat">
            <strong>RAG</strong>
            <span>Answers grounded in</span>
            <span className="stat-sub">your own materials</span>
          </div>
        </section>
      </Reveal>

      {}
      <Reveal>
        <div className="style-switcher-wrap">
          <p className="style-switcher-label">One click, any citation style.</p>
          <CitationStyleSwitcher />
        </div>
      </Reveal>

      {}
      <div
        className="ticker"
        aria-label="Supported formats and citation styles"
      >
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span
              className="ticker-item"
              key={`${t}-${i}`}
              aria-hidden={i >= TICKER_ITEMS.length ? "true" : undefined}
            >
              <span className="ticker-dot" aria-hidden="true" />
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="ticker-spacer" />

      {}
      <section className="landing-features" id="features">
        <FeatureCards />
      </section>

      {}
      <Reveal className="reveal-wide">
        <section className="pipeline-section" id="process">
          <div className="section-heading">
            <span className="section-kicker">The process</span>
            <h2>How a citation gets checked.</h2>
            <p>
              Four steps stand between your question and an answer you can rely
              on.
            </p>
          </div>

          <ol className="pipeline-grid">
            {PIPELINE.map((s, i) => (
              <li className="pipeline-step" key={s.n} style={{ "--i": i }}>
                <span className="pipeline-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {}
      <Reveal className="reveal-wide">
        <LiveDemoSection />
      </Reveal>
      <Reveal className="reveal-wide">
        <DesignSection />
      </Reveal>
      <Reveal className="reveal-wide">
        <StackSection />
      </Reveal>
      <Reveal className="reveal-wide">
        <ComparisonSection />
      </Reveal>
      <Reveal className="reveal-wide">
        <TestimonialsSection />
      </Reveal>
      <Reveal className="reveal-wide">
        <PricingSection onEnter={goRegister} />
      </Reveal>
      <Reveal className="reveal-wide">
        <ForSection />
      </Reveal>
      <Reveal className="reveal-wide">
        <QuizSection />
      </Reveal>
      <Reveal className="reveal-wide">
        <FaqSection />
      </Reveal>
      <CtaBanner onEnter={goRegister} />
      <Footer onEnter={goLogin} />
    </div>
  );
}
