import { useEffect, useRef, useState } from "react";
import "../styles/ScrollAccessories.css";

const SHOW_AFTER = 500;
const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const smoothTo = (top) =>
  window.scrollTo({
    top,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });

export default function ScrollAccessories() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [items, setItems] = useState([{ title: "Top" }]);
  const [active, setActive] = useState(0);

  const elsRef = useRef([]);

  useEffect(() => {
    let raf = 0;

    const scan = () => {
      const found = [
        ...document.querySelectorAll("section, [data-scroll-section]"),
      ]
        .filter((el) => el.offsetHeight > 120)
        .map((el) => ({
          el,
          title:
            el.dataset.scrollSection ||
            el.querySelector("h2")?.textContent?.trim() ||
            "",
        }))
        .filter((s) => s.title);

      elsRef.current = [null, ...found.map((s) => s.el)];
      const next = [
        { title: "Top" },
        ...found.map((s) => ({ title: s.title })),
      ];
      setItems((prev) =>
        prev.length === next.length &&
        prev.every((p, i) => p.title === next[i].title)
          ? prev
          : next,
      );
    };

    const update = () => {
      raf = 0;
      const { scrollTop, scrollHeight, clientHeight } =
        document.documentElement;
      const max = scrollHeight - clientHeight;
      const pct = max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0;
      setProgress(Math.round(pct * 10) / 10);
      setShowTop(scrollTop > SHOW_AFTER);

      const els = elsRef.current;
      let idx = 0;
      for (let i = 1; i < els.length; i++) {
        if (els[i].getBoundingClientRect().top <= window.innerHeight * 0.4)
          idx = i;
      }
      if (pct >= 99.5 && els.length > 1) idx = els.length - 1;
      setActive(idx);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    let scanRaf = 0;
    const scheduleScan = () => {
      if (scanRaf) return;
      scanRaf = requestAnimationFrame(() => {
        scanRaf = 0;
        scan();
        schedule();
      });
    };

    scan();
    update();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", scheduleScan);

    const mo = new MutationObserver(scheduleScan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", scheduleScan);
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (scanRaf) cancelAnimationFrame(scanRaf);
    };
  }, []);

  const goTo = (i) => {
    const el = elsRef.current[i];
    if (!el) return smoothTo(0);
    smoothTo(el.getBoundingClientRect().top + window.scrollY - 16);
  };

  return (
    <>
      <div
        className="scroll-progress-track"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="scroll-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {items.length > 2 && (
        <nav className="scroll-rail" aria-label="Page sections">
          {items.map((item, i) => (
            <button
              key={`${item.title}-${i}`}
              className={`scroll-rail-dot${i === active ? " active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={item.title}
              aria-current={i === active ? "true" : undefined}
            >
              <span className="scroll-rail-label">{item.title}</span>
            </button>
          ))}
        </nav>
      )}

      <button
        className={`back-to-top${showTop ? " visible" : ""}`}
        onClick={(e) => {
          smoothTo(0);
          e.currentTarget.blur();
        }}
        aria-label="Back to top"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
      >
        <svg
          className="back-to-top-ring"
          viewBox="0 0 52 52"
          aria-hidden="true"
        >
          <circle className="ring-bg" cx="26" cy="26" r={RING_R} />
          <circle
            className="ring-fill"
            cx="26"
            cy="26"
            r={RING_R}
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress / 100)}
          />
        </svg>
        <span aria-hidden="true">↑</span>
      </button>
    </>
  );
}
