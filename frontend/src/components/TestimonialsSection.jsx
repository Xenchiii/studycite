import { useEffect, useRef, useState } from "react";
import "../styles/TestimonialsSection.css";

const QUOTES = [
  {
    initials: "M. R.",
    role: "4th Year, Nursing",
    quote:
      "I stopped losing points for a missing page number in a block quote. It just tells me before I submit.",
  },
  {
    initials: "J. T.",
    role: "Thesis candidate, Education",
    quote:
      "My adviser can see exactly what's already been checked instead of me explaining it in a meeting.",
  },
  {
    initials: "A. D.",
    role: "2nd Year, Political Science",
    quote:
      "It caught a source that agreed with me on one page and contradicted me two pages later. I'd have missed that.",
  },
];

const DWELL_MS = 6000;
const SWIPE_PX = 48;

export default function TestimonialsSection() {
  const n = QUOTES.length;
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const sectionRef = useRef(null);
  const swipeStartX = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setOffscreen(!entry.isIntersecting),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const autoplay = !userPaused && !reducedMotion;
  const hold = hovered || keyboardFocus || offscreen;

  const go = (i) => setIndex(((i % n) + n) % n);

  const positionOf = (i) => {
    const d = (i - index + n) % n;
    if (d === 0) return "active";
    return d === n - 1 ? "before" : "after";
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") go(index - 1);
    if (e.key === "ArrowRight") go(index + 1);
  };

  const onPointerDown = (e) => {
    swipeStartX.current = e.clientX;
  };
  const onPointerUp = (e) => {
    if (swipeStartX.current == null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? index + 1 : index - 1);
  };

  return (
    <section
      ref={sectionRef}
      className="testimonials-section"
      aria-roledescription="carousel"
      aria-labelledby="testimonials-title"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => setKeyboardFocus(e.target.matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardFocus(false);
      }}
    >
      <div className="section-heading">
        <span className="section-kicker">No. 08 — On record</span>
        <h2 id="testimonials-title">Notes left in the suggestion box.</h2>
      </div>

      <div className="carousel">
        <button
          className="carousel-arrow left"
          onClick={() => go(index - 1)}
          aria-label="Previous note"
        >
          ‹
        </button>

        <div
          className="tm-stage"
          aria-live={autoplay ? "off" : "polite"}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeStartX.current = null)}
        >
          {QUOTES.map((q, i) => {
            const pos = positionOf(i);
            return (
              <figure
                key={q.initials}
                className="testimonial-card tm-card"
                data-pos={pos}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}`}
                aria-hidden={pos !== "active"}
              >
                <blockquote className="testimonial-quote">
                  “{q.quote}”
                </blockquote>
                <figcaption className="testimonial-sig">
                  <span className="testimonial-initials">{q.initials}</span>
                  <span className="testimonial-role">{q.role}</span>
                  <span className="tm-count" aria-hidden="true">
                    {i + 1} of {n}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <button
          className="carousel-arrow right"
          onClick={() => go(index + 1)}
          aria-label="Next note"
        >
          ›
        </button>
      </div>

      <div className="tm-controls">
        <div className="tm-dots" data-auto={autoplay} data-hold={hold}>
          {QUOTES.map((q, i) => (
            <button
              key={q.initials}
              className={`tm-dot${i === index ? " active" : ""}`}
              onClick={() => go(i)}
              aria-label={`Show note ${i + 1} of ${n}`}
              aria-current={i === index}
            >
              <span className="tm-pip">
                {i === index && (
                  <span
                    key={index}
                    className="tm-fill"
                    style={{ "--dwell": `${DWELL_MS}ms` }}
                    onAnimationEnd={() => autoplay && go(index + 1)}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        {!reducedMotion && (
          <button
            className="tm-toggle"
            onClick={() => setUserPaused((p) => !p)}
            aria-pressed={userPaused}
          >
            {userPaused ? "Resume" : "Pause"}
          </button>
        )}
      </div>
    </section>
  );
}
