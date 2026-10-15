import "../styles/ForSection.css";
const AUDIENCES = [
  {
    tag: "Ticket A",
    letter: "A",
    title: "Students",
    body: "Working on a research paper, thesis chapter, or exam review who need to know an answer actually traces back to their own readings.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5z" />
        <path d="M7 12v4c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4" />
        <path d="M21 9.5V15" />
      </svg>
    ),
  },
  {
    tag: "Ticket B",
    letter: "B",
    title: "Study groups",
    body: "Sharing one set of sources across a group project and wanting everyone to cite the same passage the same way.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="3" />
        <circle cx="16.5" cy="9.5" r="2.4" />
        <path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <path d="M15 14.2c.5-.2 1-.2 1.5-.2 2.5 0 4.5 1.7 4.5 4.5" />
      </svg>
    ),
  },
  {
    tag: "Ticket C",
    letter: "C",
    title: "Educators",
    body: "Who'd rather point students at a tool that reinforces good citation habits than one that quietly writes the paragraph for them.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="12" rx="1" />
        <path d="M8 20h8M12 16v4" />
        <path d="m8.5 10 2.2 2.2L15.5 8" />
      </svg>
    ),
  },
];

export default function ForSection() {
  return (
    <section className="for-section" id="for">
      <div className="section-heading">
        <span className="section-kicker">No. 10 — For</span>
        <h2>Who's actually pulling these cards.</h2>
        <p>
          StudyCite is scoped for people who need to show their work, not just
          get an answer.
        </p>
      </div>

      <div className="audience-grid">
        {AUDIENCES.map((a, i) => (
          <article className="audience-card" key={a.title} style={{ "--i": i }}>
            <div className="audience-main">
              <div className="audience-top">
                <span className="audience-icon">{a.icon}</span>
                <span className="audience-tag">{a.tag}</span>
              </div>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </div>

            <div className="audience-stub" aria-hidden="true">
              <span className="stub-letter">{a.letter}</span>
              <span className="stub-text">Admit one</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
