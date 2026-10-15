import "../styles/faq-section.css";

const FAQS = [
  {
    q: "Does StudyCite write my paper for me?",
    a: "No. It reads what you've already written, checks it against the sources you upload, and flags problems — it never generates paragraphs to insert into your draft.",
  },
  {
    q: "Do I still need to read my sources?",
    a: "Yes. StudyCite points you to the exact passage behind each answer so you can check it quickly, but it can't judge whether a source is right for your argument. Treat a stamp as a shortcut to the page, not a substitute for reading it.",
  },
  {
    q: "What file types can I upload?",
    a: "PDF, DOCX, TXT, and Markdown for now. Scanned PDFs without a text layer aren't supported yet.",
  },
  {
    q: "Does it check the open internet?",
    a: "No — only the documents you've uploaded into that session. If a claim isn't in your sources, StudyCite says so instead of guessing.",
  },
  {
    q: "Can I use more than one document at a time?",
    a: "Yes. Upload as many as you need to a session, then tick or untick them in the sidebar to choose which ones a question should draw on. Start a new session when you move to a different paper.",
  },
  {
    q: "How do I see where an answer came from?",
    a: "Click the numbered tag in any answer. The source panel opens the matching excerpt, along with the document name, the page, and a match score.",
  },
  {
    q: "What do the match scores mean?",
    a: "They show how closely a passage supports the claim. A verified match is a strong fit. A low-confidence match is related but only partly supports it. A weak match barely touches it, so check it before you rely on it.",
  },
  {
    q: "What happens if I don't have an API key configured?",
    a: "StudyCite falls back to extractive mode: it shows you the best-matching excerpt directly instead of a synthesized summary. No cost, still grounded.",
  },
  {
    q: "Which citation styles can I copy?",
    a: "APA, MLA, Chicago, and IEEE. Pick a style and copy the formatted reference, with italics intact, straight into your document.",
  },
];

export default function FaqSection({ id = "faq", faqs = FAQS }) {
  return (
    <section className="faq-section" id={id} aria-labelledby={`${id}-heading`}>
      <div className="section-heading">
        <span className="section-kicker">No. 11 — Notes</span>
        <h2 id={`${id}-heading`}>Questions from the front desk.</h2>
      </div>

      <div className="faq-list">
        {faqs.map((item) => (
          <details className="faq-item" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
