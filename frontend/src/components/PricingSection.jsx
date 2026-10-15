import "../styles/PricingSection.css";

const TIERS = [
  {
    name: "Reader's Card",
    serial: "Card No. 001",
    price: "Free",
    tagline: "Everything you need for one paper at a time.",
    perks: [
      "Unlimited citation checks",
      "Up to 5 uploaded sources",
      "APA, MLA, Chicago, IEEE formatting",
      "Extractive answers, no API key needed",
    ],
    cta: "Start studying free",
    highlight: false,
  },
  {
    name: "Reference Card",
    serial: "Card No. 002",
    price: "For classes & groups",
    tagline: "For thesis work, group papers, and adviser check-ins.",
    perks: [
      "Unlimited sources per session",
      "Adviser read-only sharing",
      "Group paper support",
      "Class rubric matching",
    ],
    cta: "Talk to your department",
    highlight: true,
  },
];

export default function PricingSection({ onEnter, onContact }) {
  return (
    <section className="pricing-section" id="pricing">
      <div className="section-heading">
        <span className="section-kicker">No. 09 — Membership</span>
        <h2>Two cards, same catalog.</h2>
        <p>
          Built as a class project — pricing here reflects the proposal's scope,
          not a live billing system.
        </p>
      </div>

      <div className="pricing-grid">
        {TIERS.map((t) => (
          <article
            className={`pricing-card${t.highlight ? " highlight" : ""}`}
            key={t.name}
            aria-label={t.name}
          >
            <span className="pricing-hole" aria-hidden="true" />

            <header className="pricing-head">
              <span className="pricing-serial">{t.serial}</span>
              {t.highlight && (
                <span className="pricing-badge">Recommended</span>
              )}
            </header>

            <div className="pricing-body">
              <h3>{t.name}</h3>
              <p
                className={`pricing-price${t.price.length > 10 ? " is-text" : ""}`}
              >
                {t.price}
              </p>
              <p className="pricing-tagline">{t.tagline}</p>

              <ul className="pricing-perks">
                {t.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>

              <button
                className={
                  t.highlight ? "hero-cta-primary" : "hero-cta-secondary-btn"
                }
                onClick={t.highlight ? onContact || onEnter : onEnter}
              >
                {t.cta}
              </button>
            </div>

            <div className="pricing-barcode" aria-hidden="true" />
          </article>
        ))}
      </div>

      <p className="pricing-fineprint">
        <span className="pricing-fineprint-stamp">Class project</span>
        No payment is collected anywhere on this site.
      </p>
    </section>
  );
}
