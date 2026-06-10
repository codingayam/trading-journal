import type { SetupSummary } from "@/lib/setups";

function percent(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(0)}%`;
}

function ratio(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(2)}R`;
}

function money(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function SetupSummaryList({ setups }: { setups: SetupSummary[] }) {
  return (
    <article className="card span-2" id="setups">
      <div className="card-heading trade-log-heading">
        <div>
          <p className="eyebrow">Setups</p>
          <h2>Setup Risk / Reward</h2>
        </div>
        <span>{setups.length} active</span>
      </div>

      <div className="setup-grid">
        {setups.map((setup) => (
          <section className="setup-panel" key={setup.id}>
            <div className="setup-heading">
              <div>
                <h3>{setup.name}</h3>
                <p>{setup.description ?? "No description"}</p>
              </div>
              <span className={setup.isActive ? "badge badge-success" : "badge badge-neutral"}>
                {setup.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <dl className="setup-metrics">
              <div>
                <dt>Trades</dt>
                <dd>{setup.totalTrades}</dd>
              </div>
              <div>
                <dt>Closed</dt>
                <dd>{setup.closedTrades}</dd>
              </div>
              <div>
                <dt>Win Rate</dt>
                <dd>{percent(setup.winRate)}</dd>
              </div>
              <div>
                <dt>Risk / Reward</dt>
                <dd>{ratio(setup.riskReward)}</dd>
              </div>
              <div>
                <dt>Avg Win</dt>
                <dd className="positive">{money(setup.averageWin)}</dd>
              </div>
              <div>
                <dt>Avg Loss</dt>
                <dd className="negative">{money(setup.averageLoss)}</dd>
              </div>
            </dl>

            {setup.playbook ? <p className="setup-playbook">{setup.playbook}</p> : null}
          </section>
        ))}
      </div>
    </article>
  );
}
