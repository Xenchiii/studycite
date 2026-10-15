const ROWS = [
  {
    label: "Cites the exact passage it used",
    studycite: true,
    chatbot: false,
    manual: true,
  },
  {
    label: "Works only from your uploaded material",
    studycite: true,
    chatbot: false,
    manual: true,
  },
  {
    label: "Flags uncited or weak claims",
    studycite: true,
    chatbot: false,
    manual: false,
  },
  {
    label: "Never invents a reference",
    studycite: true,
    chatbot: false,
    manual: true,
  },
  {
    label: "Takes minutes, not hours",
    studycite: true,
    chatbot: true,
    manual: false,
  },
];

function Mark({ ok }) {
  return (
    <span className={`mark ${ok ? "mark-yes" : "mark-no"}`}>
      {ok ? "✓" : "✗"}
    </span>
  );
}

export default function ComparisonSection() {
  return (
    <section className="comparison-section">
      <div className="section-heading">
        <span className="section-kicker">No. 07 — Compared</span>
        <h2>How this stacks up against the usual shortcuts.</h2>
        <p>
          A general chatbot is fast but untraceable. Checking everything by hand
          is traceable but slow. This is meant to sit in between.
        </p>
      </div>

      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th></th>
              <th>StudyCite</th>
              <th>Generic chatbot</th>
              <th>Checking by hand</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <td className="comparison-label">{r.label}</td>
                <td>
                  <Mark ok={r.studycite} />
                </td>
                <td>
                  <Mark ok={r.chatbot} />
                </td>
                <td>
                  <Mark ok={r.manual} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
