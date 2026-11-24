const ROWS = [
  ['Stakeholder lists that go stale', 'Stakeholder maps you can act on'],
  ['Plans in one file, comms in another', 'Plans, comms and tasks in one view'],
  ['Readiness guessed from a survey', 'Readiness from real training completion'],
  ['Adoption reported after the fact', 'Adoption tracked as it happens'],
  ['Status packs built by hand', 'Reports generated from your project data'],
];

export default function LandingCompareSection() {
  return (
    <section className="section compare" id="compare" aria-labelledby="compare-heading">
      <div className="wrap">
        <div className="head">
          <h2 id="compare-heading">Still running change from spreadsheets?</h2>
        </div>
        <div className="compare-grid" role="table" aria-label="Spreadsheets compared to ChangeView">
          <div className="compare-row compare-head" role="row">
            <div className="compare-cell compare-muted" role="columnheader">
              Spreadsheets
            </div>
            <div className="compare-cell compare-accent" role="columnheader">
              ChangeView
            </div>
          </div>
          {ROWS.map(([left, right]) => (
            <div className="compare-row" role="row" key={left}>
              <div className="compare-cell compare-muted" role="cell">
                {left}
              </div>
              <div className="compare-cell compare-accent" role="cell">
                {right}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
