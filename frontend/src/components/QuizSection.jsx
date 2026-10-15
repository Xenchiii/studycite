import { useState, useEffect, useCallback } from "react";
import "../styles/QuizSection.css";

const POOL = [
  {
    tag: "Uncited claim",
    sentence:
      "Studies show that spaced repetition improves long-term retention significantly.",
    options: [
      { text: "This is fine as written" },
      { text: "Missing citation", correct: true },
      { text: "Over-relies on one source" },
      { text: "Wrong page number" },
    ],
    hint: "Which studies? Who ran them, and when?",
    explain:
      '"Studies show" makes a claim without naming a study. This is what StudyCite\'s uncited-claim detector flags.',
  },
  {
    tag: "Properly cited",
    sentence:
      "According to Reyes (2021, p. 45), photosynthesis converts light energy into chemical energy stored in glucose.",
    options: [
      { text: "This is fine as written", correct: true },
      { text: "Missing citation" },
      { text: "Quote doesn't match source" },
      { text: "Wrong page number" },
    ],
    hint: "Look for an author, a year, and a page.",
    explain:
      "The author, year, and page are all there. Nothing to flag. Not every sentence has a problem.",
  },
  {
    tag: "Single source",
    sentence: "Every claim in this section comes from the same 2019 blog post.",
    options: [
      { text: "This is fine as written" },
      { text: "Missing citation" },
      { text: "Over-relies on one source", correct: true },
      { text: "Broken link" },
    ],
    hint: "Count the sources behind the whole section.",
    explain:
      "Leaning on one source for an entire section is what the over-reliance warning catches, especially when that source is a blog post.",
  },
  {
    tag: "Misquote",
    sentence:
      'Chen (2018, p. 12) argues that "sleep has no measurable effect on memory." The source actually says sleep has a "modest but consistent" effect.',
    options: [
      { text: "Missing citation" },
      { text: "Quote doesn't match source", correct: true },
      { text: "Wrong page number" },
      { text: "This is fine as written" },
    ],
    hint: "Compare the quoted words with what the source really says.",
    explain:
      "The citation is formatted correctly, but the quote says the opposite of the source. Quote-to-source matching exists for cases like this.",
  },
  {
    tag: "Page mismatch",
    sentence:
      "The 1998 survey found that 62% of respondents changed jobs twice (Alvarez, 1998, p. 340). The paper is only 28 pages long.",
    options: [
      { text: "Wrong page number", correct: true },
      { text: "Missing citation" },
      { text: "Over-relies on one source" },
      { text: "This is fine as written" },
    ],
    hint: "Check the page against the length of the paper.",
    explain:
      "Page 340 can't exist in a 28-page paper. Page-range checks catch typos like this before a grader does.",
  },
  {
    tag: "Dead link",
    sentence:
      "The full dataset is available at the project site (https://data.example.edu/survey-2017), which now returns a 404 error.",
    options: [
      { text: "Missing citation" },
      { text: "Quote doesn't match source" },
      { text: "Broken link", correct: true },
      { text: "This is fine as written" },
    ],
    hint: "What does the site return?",
    explain:
      "A link that returns a 404 gives readers nothing to verify. Link checking flags it, and you can swap in an archived copy.",
  },
  {
    tag: "Stale source",
    sentence:
      "Current best practice in smartphone security is described in a 2009 guide (Park, 2009), which predates modern biometric unlocking.",
    options: [
      { text: "This is fine as written" },
      { text: "Outdated source", correct: true },
      { text: "Wrong page number" },
      { text: "Missing citation" },
    ],
    hint: 'How old is the source compared with the claim about "current" practice?',
    explain:
      "A claim about the current state of a fast-moving field needs a recent source. The citation exists, but it's too old to support it.",
  },
  {
    tag: "Too close to source",
    sentence:
      "The mitochondrion is the powerhouse of the cell, generating most of the cell's supply of ATP, which is used as a source of chemical energy (Brown, 2020, p. 8).",
    options: [
      { text: "This is fine as written" },
      { text: "Missing citation" },
      { text: "Needs quotation marks or a rewrite", correct: true },
      { text: "Broken link" },
    ],
    hint: "Is this phrasing yours, or the source's?",
    explain:
      "Citing a source doesn't make copied wording yours. If the sentence mirrors the source word for word, quote it or rewrite it.",
  },
  {
    tag: "Secondhand source",
    sentence:
      "As Hall (1976) showed, personal space varies by culture (cited in a textbook; Hall's original was never opened).",
    options: [
      { text: "Missing citation" },
      { text: "Secondary source cited as primary", correct: true },
      { text: "Wrong page number" },
      { text: "This is fine as written" },
    ],
    hint: "Did the writer read the work they're crediting?",
    explain:
      'If you only read the textbook, cite it as "Hall (1976, as cited in ...)". Presenting a secondhand source as one you read is a citation error.',
  },
  {
    tag: "Properly cited",
    sentence:
      "Global average temperatures have risen about 1.1 °C since the late 1800s (IPCC, 2021, Summary for Policymakers, p. 5).",
    options: [
      { text: "Over-relies on one source" },
      { text: "Missing citation" },
      { text: "Wrong page number" },
      { text: "This is fine as written", correct: true },
    ],
    hint: "Does the claim point to something a reader can check?",
    explain:
      "It names the body, the year, the section, and the page. A reader can verify it in under a minute.",
  },
];

const ROUND_SIZE = 6;
const LETTERS = ["A", "B", "C", "D"];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildDeck = (questions, n = questions.length) =>
  shuffle(questions)
    .slice(0, n)
    .map((q) => ({ ...q, options: shuffle(q.options) }));

const verdict = (ratio) => {
  if (ratio === 1)
    return "You'd have caught every one of these before your professor did.";
  if (ratio >= 0.7)
    return "Sharp eye. A couple slipped through, and that's the gap StudyCite is built to close.";
  if (ratio >= 0.4)
    return "Some of these are easy to miss by eye. StudyCite checks every citation in your draft automatically.";
  return "Citation problems are hard to spot when you're deep in a draft. That's why StudyCite flags them for you.";
};

export default function QuizSection() {
  const [deck, setDeck] = useState(() => buildDeck(POOL, ROUND_SIZE));
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [hintShown, setHintShown] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [done, setDone] = useState(false);

  const current = deck[step];
  const answered = selected !== null;
  const score = answers.filter((a) => a.correct).length;
  const missed = answers.filter((a) => !a.correct);

  const pick = useCallback(
    (i) => {
      if (selected !== null || !current) return;
      const correct = Boolean(current.options[i].correct);
      setSelected(i);
      setAnswers((prev) => [
        ...prev,
        { q: current, picked: i, correct, hinted: hintShown },
      ]);
      setStreak((s) => {
        const ns = correct ? s + 1 : 0;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
    },
    [selected, current, hintShown],
  );

  const next = useCallback(() => {
    if (step + 1 < deck.length) {
      setStep((s) => s + 1);
      setSelected(null);
      setHintShown(false);
    } else {
      setDone(true);
    }
  }, [step, deck.length]);

  const startRound = (nextDeck) => {
    setDeck(nextDeck);
    setStep(0);
    setSelected(null);
    setHintShown(false);
    setAnswers([]);
    setStreak(0);
    setBestStreak(0);
    setDone(false);
  };

  const newRound = () => startRound(buildDeck(POOL, ROUND_SIZE));
  const retryMissed = () => startRound(buildDeck(missed.map((m) => m.q)));

  useEffect(() => {
    if (done) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (/^[1-4]$/.test(e.key)) {
        pick(Number(e.key) - 1);
      } else if (e.key.toLowerCase() === "h" && !answered) {
        setHintShown(true);
      } else if ((e.key === "ArrowRight" || e.key === "Enter") && answered) {
        if (e.key === "Enter" && tag === "BUTTON") return;
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, answered, pick, next]);

  const correctIndex = current
    ? current.options.findIndex((o) => o.correct)
    : -1;

  return (
    <section className="quiz-section">
      <div className="section-heading">
        <span className="section-kicker">No. 12 — Spot the issue</span>
        <h2>Would you catch this one?</h2>
        <p>
          {ROUND_SIZE} sentences, real citation patterns, drawn from a pool of{" "}
          {POOL.length}. Pick what's wrong, or confirm it's actually fine.
        </p>
      </div>

      <div className="quiz-card">
        {!done ? (
          <>
            <div className="qz-topbar">
              <div className="quiz-progress">
                Question {step + 1} of {deck.length}
              </div>
              <div className="qz-streak" aria-live="polite">
                {streak >= 2 ? `${streak} in a row` : `${score} correct`}
              </div>
            </div>

            <div
              className="qz-track"
              role="img"
              aria-label={`Progress: question ${step + 1} of ${deck.length}`}
            >
              {deck.map((_, i) => {
                let cls = "qz-seg";
                if (answers[i]) cls += answers[i].correct ? " ok" : " bad";
                else if (i === step) cls += " now";
                return <span key={i} className={cls} />;
              })}
            </div>

            <span className="mode-tag qz-tag">{current.tag}</span>
            <p className="quiz-sentence">"{current.sentence}"</p>

            <div
              className="quiz-options"
              role="group"
              aria-label="Answer choices"
            >
              {current.options.map((opt, i) => {
                let cls = "quiz-option";
                if (answered) {
                  if (opt.correct) cls += " correct";
                  else if (i === selected) cls += " wrong";
                }
                return (
                  <button
                    key={opt.text}
                    className={cls}
                    onClick={() => pick(i)}
                    disabled={answered && !opt.correct && i !== selected}
                    aria-keyshortcuts={String(i + 1)}
                  >
                    <span className="qz-key">{LETTERS[i]}</span>
                    <span className="qz-opt-text">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {!answered && (
              <div className="qz-hint-row">
                {hintShown ? (
                  <p className="qz-hint">Hint: {current.hint}</p>
                ) : (
                  <button
                    className="qz-hint-btn"
                    onClick={() => setHintShown(true)}
                  >
                    Show a hint
                  </button>
                )}
                <span className="qz-kbd-note">
                  Press 1–4 to answer, H for a hint
                </span>
              </div>
            )}

            {answered && (
              <div className="quiz-feedback" role="status" aria-live="polite">
                <p>
                  <strong
                    className={
                      selected === correctIndex
                        ? "qz-verdict-ok"
                        : "qz-verdict-bad"
                    }
                  >
                    {selected === correctIndex ? "Correct. " : "Not quite. "}
                  </strong>
                  {current.explain}
                </p>
                <button
                  className="hero-cta-secondary-btn"
                  onClick={next}
                  autoFocus
                >
                  {step + 1 < deck.length ? "Next question →" : "See results →"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="quiz-result">
            <div
              className={`requisition-stamp quiz-stamp${score === deck.length ? "" : " qz-stamp-review"}`}
            >
              {score === deck.length ? "APPROVED" : "REVIEW"}
            </div>
            <p className="quiz-score">
              {score} / {deck.length} correct
            </p>
            <p>{verdict(score / deck.length)}</p>

            <div className="qz-stats">
              <div>
                <strong>{bestStreak}</strong>
                <span>best streak</span>
              </div>
              <div>
                <strong>
                  {answers.filter((a) => a.correct && !a.hinted).length}
                </strong>
                <span>right, no hint</span>
              </div>
              <div>
                <strong>{answers.filter((a) => a.hinted).length}</strong>
                <span>hints used</span>
              </div>
            </div>

            {missed.length > 0 && (
              <div className="qz-review">
                <span className="design-block-label">
                  Missed — worth a second look
                </span>
                <ul>
                  {missed.map((m, i) => (
                    <li key={i}>
                      <em>"{m.q.sentence}"</em>
                      <b>Answer: {m.q.options.find((o) => o.correct).text}</b>
                      <span>{m.q.explain}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="qz-actions">
              <button className="hero-cta-secondary-btn" onClick={newRound}>
                New round
              </button>
              {missed.length > 0 && (
                <button
                  className="hero-cta-secondary-btn"
                  onClick={retryMissed}
                >
                  Retry {missed.length} missed
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
