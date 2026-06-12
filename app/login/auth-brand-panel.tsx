const previewRows = [
  { symbol: "AAPL", side: "Long", pnl: "+$420" },
  { symbol: "NVDA", side: "Long", pnl: "+$260" },
  { symbol: "TSLA", side: "Short", pnl: "-$90" },
];

export function AuthBrandPanel() {
  return (
    <section className="auth-brand-side" aria-label="Product preview">
      <div className="brand-copy">
        <p className="eyebrow">Free, lightweight, privacy-friendly</p>
        <h2>Trading Journal for the people</h2>
        <p>
          A simple place to track trades, review decisions, and build better
          habits without noisy account features.
        </p>
      </div>

      <div className="dashboard-preview" aria-hidden="true">
        <div className="preview-topbar">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-metrics">
          <div>
            <span>Trades</span>
            <strong>128</strong>
          </div>
          <div>
            <span>Win rate</span>
            <strong>62%</strong>
          </div>
          <div>
            <span>Total P/L</span>
            <strong>+$8.4k</strong>
          </div>
        </div>
        <div className="preview-table">
          {previewRows.map((row) => (
            <div className="preview-row" key={row.symbol}>
              <strong>{row.symbol}</strong>
              <span>{row.side}</span>
              <em>{row.pnl}</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
