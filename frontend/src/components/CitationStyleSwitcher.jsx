import "../styles/comparison-section.css";

const COLUMNS = [
  { key: "studycite", label: "StudyCite", highlight: true },
  { key: "chatbot", label: "Generic chatbot" },
  { key: "manual", label: "Checking by hand" },
];

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
      <span aria-hidden="true">{ok ? "✓" : "✗"}</span>
      <span className="sr-only">{ok ? "Yes" : "No"}</span>
    </span>
  );
}

export default function ComparisonSection({
  id,
  rows = ROWS,
  columns = COLUMNS,
}) {
  const cellClass = (col) => (col.highlight ? "is-highlight" : undefined);

  return (
    <section className="comparison-section" id={id}>
      <div className="section-heading">
        <h2>How this stacks up against the usual shortcuts.</h2>
        <p>
          A general chatbot is fast but untraceable. Checking everything by hand
          is traceable but slow. This is meant to sit in between.
        </p>
      </div>

      {}
      <div
        className="comparison-table-wrap"
        role="region"
        aria-label="Comparison table"
        tabIndex={0}
      >
        <table className="comparison-table">
          <caption className="sr-only">
            Feature comparison of {columns.map((c) => c.label).join(", ")}
          </caption>

          <thead>
            <tr>
              <th scope="col" className="comparison-label">
                <span className="sr-only">Feature</span>
              </th>
              {columns.map((col) => (
                <th key={col.key} scope="col" className={cellClass(col)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="comparison-label">
                  {row.label}
                </th>
                {columns.map((col) => (
                  <td key={col.key} className={cellClass(col)}>
                    <Mark ok={Boolean(row[col.key])} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="comparison-label">
                Checks out
              </th>
              {columns.map((col) => (
                <td key={col.key} className={cellClass(col)}>
                  {rows.filter((r) => r[col.key]).length} of {rows.length}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
