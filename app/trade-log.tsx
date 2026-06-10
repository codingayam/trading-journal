"use client";

import { FormEvent, useMemo, useState } from "react";

export type TradeRecord = {
  id: string;
  assetClass: string;
  symbol: string;
  side: string;
  quantity: number;
  entryDateTime: string;
  entryPrice: number;
  exitDateTime: string | null;
  exitPrice: number | null;
  fees: number;
  status: string;
  returnAmount: number | null;
  returnPercent: number | null;
};

type TradeFormState = {
  assetClass: string;
  symbol: string;
  side: string;
  quantity: string;
  entryDateTime: string;
  entryPrice: string;
  exitDateTime: string;
  exitPrice: string;
  fees: string;
  status: string;
};

const assetClasses = ["Stock", "Option", "Crypto", "Forex", "Futures", "Other"];

const emptyTradeForm = (): TradeFormState => ({
  assetClass: "Stock",
  symbol: "",
  side: "LONG",
  quantity: "1",
  entryDateTime: dateTimeLocalValue(new Date()),
  entryPrice: "",
  exitDateTime: "",
  exitPrice: "",
  fees: "0",
  status: "OPEN",
});

function dateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function money(value: number | null) {
  if (value === null) {
    return "Open";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function shortDate(value: string | null) {
  if (!value) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formFromTrade(trade: TradeRecord): TradeFormState {
  return {
    assetClass: trade.assetClass,
    symbol: trade.symbol,
    side: trade.side,
    quantity: String(trade.quantity),
    entryDateTime: dateTimeLocalValue(new Date(trade.entryDateTime)),
    entryPrice: String(trade.entryPrice),
    exitDateTime: trade.exitDateTime ? dateTimeLocalValue(new Date(trade.exitDateTime)) : "",
    exitPrice: trade.exitPrice === null ? "" : String(trade.exitPrice),
    fees: String(trade.fees),
    status: trade.status,
  };
}

function sortTrades(trades: TradeRecord[]) {
  return [...trades].sort(
    (left, right) =>
      new Date(right.entryDateTime).getTime() - new Date(left.entryDateTime).getTime(),
  );
}

export function TradeLog({
  onTradesChange,
  trades,
}: {
  onTradesChange: (trades: TradeRecord[]) => void;
  trades: TradeRecord[];
}) {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TradeFormState>(() => emptyTradeForm());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openTrades = useMemo(
    () => trades.filter((trade) => trade.returnAmount === null).length,
    [trades],
  );

  function openCreateModal() {
    setError(null);
    setEditingId(null);
    setForm(emptyTradeForm());
    setModalMode("create");
  }

  function openEditModal(trade: TradeRecord) {
    setError(null);
    setEditingId(trade.id);
    setForm(formFromTrade(trade));
    setModalMode("edit");
  }

  function closeModal() {
    if (!busy) {
      setModalMode(null);
      setEditingId(null);
    }
  }

  function updateField(field: keyof TradeFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "status" && value === "OPEN"
        ? { exitDateTime: "", exitPrice: "" }
        : {}),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      ...form,
      quantity: Number(form.quantity),
      entryPrice: Number(form.entryPrice),
      exitDateTime: form.exitDateTime || null,
      exitPrice: form.exitPrice === "" ? null : Number(form.exitPrice),
      fees: Number(form.fees || 0),
    };

    const response = await fetch(
      modalMode === "edit" && editingId ? `/api/trades/${editingId}` : "/api/trades",
      {
        method: modalMode === "edit" ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.errors?.join(" ") ?? body?.error ?? "Trade could not be saved.");
      setBusy(false);
      return;
    }

    const { trade } = (await response.json()) as { trade: TradeRecord };
    onTradesChange(
      sortTrades(
        modalMode === "edit"
          ? trades.map((item) => (item.id === trade.id ? trade : item))
          : [trade, ...trades],
      ),
    );
    setBusy(false);
    setModalMode(null);
    setEditingId(null);
  }

  async function deleteTrade(tradeId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/trades/${tradeId}`, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Trade could not be deleted.");
      setBusy(false);
      return;
    }

    onTradesChange(trades.filter((trade) => trade.id !== tradeId));
    setBusy(false);
  }

  return (
    <article className="card span-2" id="trades">
      <div className="card-heading trade-log-heading">
        <div>
          <p className="eyebrow">Trades</p>
          <h2>Trade Log</h2>
        </div>
        <div className="trade-log-actions">
          <span className="badge badge-neutral">{openTrades} open</span>
          <button className="primary-button" onClick={openCreateModal} type="button">
            New Trade
          </button>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Entry</th>
              <th>Symbol</th>
              <th>Asset</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Return</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td>{shortDate(trade.entryDateTime)}</td>
                <td className="symbol">{trade.symbol}</td>
                <td>{trade.assetClass}</td>
                <td>
                  <span className={trade.side === "LONG" ? "badge badge-success" : "badge badge-danger"}>
                    {trade.side}
                  </span>
                </td>
                <td>{trade.quantity}</td>
                <td>{money(trade.entryPrice)}</td>
                <td>{trade.exitPrice === null ? "Open" : money(trade.exitPrice)}</td>
                <td
                  className={
                    trade.returnAmount === null
                      ? "muted-cell"
                      : trade.returnAmount >= 0
                        ? "positive"
                        : "negative"
                  }
                >
                  {trade.returnAmount === null
                    ? "Open"
                    : `${money(trade.returnAmount)} (${trade.returnPercent}%)`}
                </td>
                <td>
                  <span className="badge badge-neutral">{trade.status}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="secondary-button table-button"
                      onClick={() => openEditModal(trade)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="secondary-button table-button danger-button"
                      disabled={busy}
                      onClick={() => deleteTrade(trade.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="trade-modal-title"
            aria-modal="true"
            className="modal-panel"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Manual Trade</p>
                <h2 id="trade-modal-title">
                  {modalMode === "edit" ? "Edit Trade" : "New Trade"}
                </h2>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                disabled={busy}
                onClick={closeModal}
                type="button"
              >
                x
              </button>
            </div>

            <form className="entry-form" onSubmit={submit}>
              <label>
                Asset class
                <select
                  name="assetClass"
                  onChange={(event) => updateField("assetClass", event.target.value)}
                  value={form.assetClass}
                >
                  {assetClasses.map((assetClass) => (
                    <option key={assetClass}>{assetClass}</option>
                  ))}
                </select>
              </label>
              <label>
                Symbol
                <input
                  name="symbol"
                  onChange={(event) => updateField("symbol", event.target.value)}
                  placeholder="AAPL"
                  required
                  value={form.symbol}
                />
              </label>
              <div className="span-full side-control" role="group" aria-label="Side">
                <button
                  aria-pressed={form.side === "LONG"}
                  className="side-long"
                  onClick={() => updateField("side", "LONG")}
                  type="button"
                >
                  Long / Buy
                </button>
                <button
                  aria-pressed={form.side === "SHORT"}
                  className="side-short"
                  onClick={() => updateField("side", "SHORT")}
                  type="button"
                >
                  Short / Sell
                </button>
              </div>
              <label>
                Quantity
                <input
                  min="1"
                  name="quantity"
                  onChange={(event) => updateField("quantity", event.target.value)}
                  required
                  step="1"
                  type="number"
                  value={form.quantity}
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  onChange={(event) => updateField("status", event.target.value)}
                  value={form.status}
                >
                  <option>OPEN</option>
                  <option>CLOSED</option>
                </select>
              </label>
              <label>
                Entry date/time
                <input
                  name="entryDateTime"
                  onChange={(event) => updateField("entryDateTime", event.target.value)}
                  required
                  type="datetime-local"
                  value={form.entryDateTime}
                />
              </label>
              <label>
                Entry price
                <input
                  min="0"
                  name="entryPrice"
                  onChange={(event) => updateField("entryPrice", event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={form.entryPrice}
                />
              </label>
              <label>
                Exit date/time
                <input
                  disabled={form.status === "OPEN"}
                  name="exitDateTime"
                  onChange={(event) => updateField("exitDateTime", event.target.value)}
                  type="datetime-local"
                  value={form.exitDateTime}
                />
              </label>
              <label>
                Exit price
                <input
                  disabled={form.status === "OPEN"}
                  min="0"
                  name="exitPrice"
                  onChange={(event) => updateField("exitPrice", event.target.value)}
                  step="0.01"
                  type="number"
                  value={form.exitPrice}
                />
              </label>
              <label className="span-full">
                Fees
                <input
                  min="0"
                  name="fees"
                  onChange={(event) => updateField("fees", event.target.value)}
                  step="0.01"
                  type="number"
                  value={form.fees}
                />
              </label>
              {error ? <p className="form-error span-full">{error}</p> : null}
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={closeModal}
                  type="button"
                >
                  Cancel
                </button>
                <button className="save-button" disabled={busy} type="submit">
                  Save Trade
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </article>
  );
}
