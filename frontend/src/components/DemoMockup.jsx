export default function DemoMockup() {
  return (
    <div className="demo-mockup">
      <div className="demo-titlebar">
        <span className="demo-dot dot-blue" />
        <span className="demo-dot dot-amber" />
        <span className="demo-dot dot-green" />
        <span className="demo-title">StudyCite — Citation Check</span>
      </div>
      <div className="demo-body">
        <div className="demo-col">
          <span className="demo-col-label">Conversation</span>
          <div className="demo-bubble demo-bubble-user">
            Why does entropy increase in an isolated system?
          </div>
          <div className="demo-bubble demo-bubble-assistant">
            In an isolated system, entropy rises because energy naturally
            spreads toward the most probable arrangement{" "}
            <span className="cite-tag">1</span> — this is the Second Law of
            Thermodynamics <span className="cite-tag">2</span>.
          </div>
        </div>
        <div className="demo-col">
          <span className="demo-col-label">Source Panel</span>
          <div className="demo-source-card">
            <div className="demo-source-head">
              <span className="score-pill high">VERIFIED</span>
              <span className="demo-page">p. 118</span>
            </div>
            <strong>Physical_Chemistry_Notes.pdf</strong>
            <p>
              "…for an isolated system, the entropy will increase until
              equilibrium is reached, the point of maximum probability…"
            </p>
          </div>
          <div className="demo-source-card">
            <div className="demo-source-head">
              <span className="score-pill mid">LOW CONFIDENCE</span>
              <span className="demo-page">p. 44</span>
            </div>
            <strong>Lecture_Slides_Wk3.pdf</strong>
            <p>
              "…systems tend toward disorder over time, generally speaking…"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
