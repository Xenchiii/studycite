import { useId } from "react";
import "../styles/cta-banner.css";

export default function CtaBanner({
  onEnter,
  heading = "Stop guessing whether your citations hold up.",
  body = "File your sources, ask your question, and get an answer stamped with exactly where it came from.",
  label = "Open the Reading Room",
}) {
  const headingId = useId();

  return (
    <section className="cta-banner" aria-labelledby={headingId}>
      <div className="cta-banner-inner">
        <div className="cta-banner-plate">
          <h2 id={headingId}>{heading}</h2>
          <p>{body}</p>
          <button type="button" className="cta-banner-btn" onClick={onEnter}>
            {label}
            <span className="cta-banner-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
