"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import type { DashboardOpenPositionPnl } from "@/lib/dashboard";

type ExecutionAction = "BUY" | "SELL";

export type TradeExecutionRecord = {
  id?: string;
  action: string;
  executedAt: string;
  quantity: number;
  price: number;
  fees: number;
};

export type TradeRecord = {
  id: string;
  assetClass: string;
  symbol: string;
  side: string;
  quantity: number;
  remainingQuantity: number;
  entryDateTime: string;
  entryPrice: number;
  exitDateTime: string | null;
  exitPrice: number | null;
  fees: number;
  status: string;
  returnAmount: number | null;
  returnPercent: number | null;
  executions: TradeExecutionRecord[];
};

export type TradeFormState = {
  assetClass: string;
  symbol: string;
  side: string;
  quantity: string;
  entryDateTime: string;
  entryPrice: string;
  fees: string;
};

export type SellFormState = {
  mode: "partial" | "full";
  quantity: string;
  executedAt: string;
  price: string;
  fees: string;
};

const assetClasses = ["Stock", "Option", "Crypto", "Forex", "Futures", "Other"];
export const tradesPerPage = 10;

const emptyTradeForm = (): TradeFormState => ({
  assetClass: "Stock",
  symbol: "",
  side: "LONG",
  quantity: "1",
  entryDateTime: dateTimeLocalValue(new Date()),
  entryPrice: "",
  fees: "0",
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

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function percent(value: number | null) {
  return value === null ? "Open" : `${value}%`;
}

export function openPositionMarketValue(
  trade: Pick<TradeRecord, "entryPrice" | "remainingQuantity">,
  latestPrice?: number | null,
) {
  return trade.remainingQuantity * (latestPrice ?? trade.entryPrice);
}

export type TradeOpenPositionPnlDetail =
  | {
      status: "available";
      latestPrice: number;
      quoteAsOf: string | null;
      value: number;
    }
  | {
      status: "unavailable";
      message: string;
      value: null;
    };

export function openPositionPnlDetail(
  trade: Pick<TradeRecord, "remainingQuantity" | "status">,
  openPositionPnl?: DashboardOpenPositionPnl,
): TradeOpenPositionPnlDetail {
  if (trade.status !== "OPEN" || trade.remainingQuantity <= 0) {
    return {
      status: "unavailable",
      message: "No open quantity remains for this position.",
      value: null,
    };
  }

  if (
    openPositionPnl?.status === "available" &&
    openPositionPnl.latestPrice !== null &&
    openPositionPnl.unrealizedPnl !== null
  ) {
    return {
      status: "available",
      latestPrice: openPositionPnl.latestPrice,
      quoteAsOf: openPositionPnl.quoteAsOf ?? null,
      value: openPositionPnl.unrealizedPnl,
    };
  }

  return {
    status: "unavailable",
    message: openPositionPnl?.message ?? "Latest EOD quote has not been fetched for this open trade yet.",
    value: null,
  };
}

function formFromTrade(trade: TradeRecord): TradeFormState {
  const opening = openingExecution(trade);

  return {
    assetClass: trade.assetClass,
    symbol: trade.symbol,
    side: trade.side,
    quantity: String(opening?.quantity ?? trade.quantity),
    entryDateTime: dateTimeLocalValue(new Date(opening?.executedAt ?? trade.entryDateTime)),
    entryPrice: String(opening?.price ?? trade.entryPrice),
    fees: String(opening?.fees ?? trade.fees),
  };
}

function addExecutionFormFromTrade(trade: TradeRecord): TradeFormState {
  return {
    assetClass: trade.assetClass,
    symbol: trade.symbol,
    side: trade.side,
    quantity: "1",
    entryDateTime: dateTimeLocalValue(new Date()),
    entryPrice: "",
    fees: "0",
  };
}

function sortTrades(trades: TradeRecord[]) {
  return [...trades].sort(
    (left, right) =>
      new Date(right.entryDateTime).getTime() - new Date(left.entryDateTime).getTime(),
  );
}

function tickerKey(trade: Pick<TradeRecord, "assetClass" | "symbol">) {
  return `${trade.assetClass}\u0000${trade.symbol.toUpperCase()}`;
}

export function pageCountForTrades(totalTrades: number) {
  return Math.max(1, Math.ceil(totalTrades / tradesPerPage));
}

export function clampTradePage(page: number, totalTrades: number) {
  return Math.min(Math.max(page, 1), pageCountForTrades(totalTrades));
}

export function paginatedTrades(trades: TradeRecord[], page: number) {
  const safePage = clampTradePage(page, trades.length);
  const start = (safePage - 1) * tradesPerPage;
  return trades.slice(start, start + tradesPerPage);
}

export function openingActionForSide(side: string): ExecutionAction {
  return side === "SHORT" ? "SELL" : "BUY";
}

export function reducingActionForSide(side: string): ExecutionAction {
  return side === "SHORT" ? "BUY" : "SELL";
}

function openingExecution(trade: TradeRecord) {
  const action = openingActionForSide(trade.side);
  return trade.executions.find((execution) => execution.action === action);
}

function fallbackOpeningExecution(trade: TradeRecord): TradeExecutionRecord {
  return {
    action: openingActionForSide(trade.side),
    executedAt: trade.entryDateTime,
    quantity: trade.quantity,
    price: trade.entryPrice,
    fees: 0,
  };
}

export function createOpeningExecutionPayload(form: TradeFormState) {
  return {
    action: openingActionForSide(form.side),
    executedAt: form.entryDateTime,
    quantity: Number(form.quantity),
    price: Number(form.entryPrice),
    fees: Number(form.fees || 0),
  };
}

export function replaceOpeningExecutionPayload(trade: TradeRecord, form: TradeFormState) {
  const openingAction = openingActionForSide(trade.side);
  const executions = trade.executions.length > 0 ? trade.executions : [fallbackOpeningExecution(trade)];
  let replaced = false;

  const nextExecutions = executions.map((execution) => {
    if (!replaced && execution.action === openingAction) {
      replaced = true;
      return {
        ...execution,
        executedAt: form.entryDateTime,
        quantity: Number(form.quantity),
        price: Number(form.entryPrice),
        fees: Number(form.fees || 0),
      };
    }

    return execution;
  });

  return replaced ? nextExecutions : [createOpeningExecutionPayload(form), ...nextExecutions];
}

export function appendSellExecutionPayload(trade: TradeRecord, form: SellFormState) {
  const quantity = form.mode === "full" ? trade.remainingQuantity : Number(form.quantity);
  const executions = trade.executions.length > 0 ? trade.executions : [fallbackOpeningExecution(trade)];

  return [
    ...executions,
    {
      action: reducingActionForSide(trade.side),
      executedAt: form.executedAt,
      quantity,
      price: Number(form.price),
      fees: Number(form.fees || 0),
    },
  ];
}

export function TradeLog({
  onTradesChange,
  openPositionPnl = [],
  trades,
}: {
  onTradesChange: (trades: TradeRecord[]) => void;
  openPositionPnl?: DashboardOpenPositionPnl[];
  trades: TradeRecord[];
}) {
  const [modalMode, setModalMode] = useState<"buy" | "addBuy" | "edit" | "sell" | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<TradeFormState>(() => emptyTradeForm());
  const [sellForm, setSellForm] = useState<SellFormState>(() => ({
    mode: "partial",
    quantity: "1",
    executedAt: dateTimeLocalValue(new Date()),
    price: "",
    fees: "0",
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedTrade = useMemo(
    () => trades.find((trade) => trade.id === selectedTradeId) ?? null,
    [selectedTradeId, trades],
  );
  const selectedOpenPositionPnl = useMemo(
    () =>
      selectedTrade ? openPositionPnl.find((point) => point.tradeId === selectedTrade.id) : undefined,
    [openPositionPnl, selectedTrade],
  );
  const selectedOpenPositionDetail = useMemo(
    () =>
      selectedTrade ? openPositionPnlDetail(selectedTrade, selectedOpenPositionPnl) : null,
    [selectedOpenPositionPnl, selectedTrade],
  );
  const openTrades = useMemo(
    () => trades.filter((trade) => trade.status === "OPEN").length,
    [trades],
  );
  const pageCount = pageCountForTrades(trades.length);
  const visibleTrades = useMemo(() => paginatedTrades(trades, page), [page, trades]);

  useEffect(() => {
    setPage((current) => clampTradePage(current, trades.length));
  }, [trades.length]);

  function openBuyModal() {
    setError(null);
    setSelectedTradeId(null);
    setForm(emptyTradeForm());
    setModalMode("buy");
  }

  function openDetail(trade: TradeRecord) {
    if (!busy) {
      setError(null);
      setSelectedTradeId(trade.id);
      setModalMode(null);
    }
  }

  function openEditModal(trade: TradeRecord) {
    setError(null);
    setSelectedTradeId(trade.id);
    setForm(formFromTrade(trade));
    setModalMode("edit");
  }

  function openAddBuyModal(trade: TradeRecord) {
    setError(null);
    setSelectedTradeId(trade.id);
    setForm(addExecutionFormFromTrade(trade));
    setModalMode("addBuy");
  }

  function openSellModal(trade: TradeRecord) {
    setError(null);
    setSelectedTradeId(trade.id);
    setSellForm({
      mode: trade.remainingQuantity > 1 ? "partial" : "full",
      quantity: String(Math.min(1, trade.remainingQuantity)),
      executedAt: dateTimeLocalValue(new Date()),
      price: "",
      fees: "0",
    });
    setModalMode("sell");
  }

  function closeModal() {
    if (!busy) {
      setModalMode(null);
      setError(null);
    }
  }

  function closeDetail() {
    if (!busy) {
      setSelectedTradeId(null);
      setModalMode(null);
      setError(null);
    }
  }

  function updateField(field: keyof TradeFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateSellField(field: keyof SellFormState, value: string) {
    setSellForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "mode" && value === "full" && selectedTrade
        ? { quantity: String(selectedTrade.remainingQuantity) }
        : {}),
    }));
  }

  function updateTradeInList(trade: TradeRecord) {
    onTradesChange(sortTrades(trades.map((item) => (item.id === trade.id ? trade : item))));
    setSelectedTradeId(trade.id);
  }

  function upsertTradeInList(trade: TradeRecord) {
    const key = tickerKey(trade);
    const nextTrades = trades.filter((item) => item.id !== trade.id && tickerKey(item) !== key);
    onTradesChange(sortTrades([trade, ...nextTrades]));
    setSelectedTradeId(trade.id);
  }

  function removeTradeFromList(tradeId: string) {
    onTradesChange(trades.filter((trade) => trade.id !== tradeId));
    if (selectedTradeId === tradeId) {
      closeDetail();
    }
  }

  function rowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, trade: TradeRecord) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(trade);
    }
  }

  async function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const editingTrade = modalMode === "edit" ? selectedTrade : null;
    const payload =
      modalMode === "edit" && editingTrade
        ? {
            assetClass: form.assetClass,
            symbol: form.symbol,
            executions: replaceOpeningExecutionPayload(editingTrade, form),
          }
        : {
            assetClass: form.assetClass,
            symbol: form.symbol,
            side: form.side,
            quantity: Number(form.quantity),
            entryDateTime: form.entryDateTime,
            entryPrice: Number(form.entryPrice),
            fees: Number(form.fees || 0),
            status: "OPEN",
            executions: [createOpeningExecutionPayload(form)],
          };

    const response = await fetch(editingTrade ? `/api/trades/${editingTrade.id}` : "/api/trades", {
      method: editingTrade ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.errors?.join(" ") ?? body?.error ?? "Trade could not be saved.");
      setBusy(false);
      return;
    }

    const { trade } = (await response.json()) as { trade: TradeRecord };
    if (editingTrade) {
      updateTradeInList(trade);
    } else {
      upsertTradeInList(trade);
      setPage(1);
    }
    setBusy(false);
    setModalMode(null);
  }

  async function submitSell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTrade) {
      return;
    }

    setBusy(true);
    setError(null);

    const quantity =
      sellForm.mode === "full" ? selectedTrade.remainingQuantity : Number(sellForm.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > selectedTrade.remainingQuantity) {
      setError(`Sell quantity must be between 1 and ${selectedTrade.remainingQuantity}.`);
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/trades/${selectedTrade.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        executions: appendSellExecutionPayload(selectedTrade, sellForm),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.errors?.join(" ") ?? body?.error ?? "Sell could not be recorded.");
      setBusy(false);
      return;
    }

    const { trade } = (await response.json()) as { trade: TradeRecord };
    updateTradeInList(trade);
    setBusy(false);
    setModalMode(null);
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

    removeTradeFromList(tradeId);
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
          <button className="primary-button" onClick={openBuyModal} type="button">
            Add Trade / Buy
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
              <th>Open</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Realized P/L</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleTrades.map((trade) => (
              <tr
                aria-label={`Open ${trade.symbol} trade details`}
                className="clickable-row"
                key={trade.id}
                onClick={() => openDetail(trade)}
                onKeyDown={(event) => rowKeyDown(event, trade)}
                role="button"
                tabIndex={0}
              >
                <td>{shortDate(trade.entryDateTime)}</td>
                <td className="symbol">{trade.symbol}</td>
                <td>{trade.assetClass}</td>
                <td>
                  <span className={trade.side === "LONG" ? "badge badge-success" : "badge badge-danger"}>
                    {trade.side}
                  </span>
                </td>
                <td>{trade.quantity}</td>
                <td>{trade.remainingQuantity}</td>
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
                    : `${money(trade.returnAmount)} (${percent(trade.returnPercent)})`}
                </td>
                <td>
                  <span className="badge badge-neutral">{trade.status}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="secondary-button table-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetail(trade);
                      }}
                      type="button"
                    >
                      Details
                    </button>
                    {trade.status === "OPEN" && trade.remainingQuantity > 0 ? (
                      <button
                        className="secondary-button table-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openSellModal(trade);
                        }}
                        type="button"
                      >
                        Sell
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination-bar" aria-label="Trade Log pagination">
        <span>
          Page {clampTradePage(page, trades.length)} of {pageCount}
        </span>
        <div className="pagination-actions">
          <button
            className="secondary-button table-button"
            disabled={page <= 1}
            onClick={() => setPage((current) => clampTradePage(current - 1, trades.length))}
            type="button"
          >
            Previous
          </button>
          <button
            className="secondary-button table-button"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => clampTradePage(current + 1, trades.length))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      {selectedTrade && !modalMode ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="trade-detail-title"
            aria-modal="true"
            className="modal-panel trade-detail-panel"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Trade Detail</p>
                <h2 id="trade-detail-title">{selectedTrade.symbol}</h2>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                disabled={busy}
                onClick={closeDetail}
                type="button"
              >
                x
              </button>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="trade-detail-summary-strip">
              <div>
                <span>Status</span>
                <strong>{selectedTrade.status}</strong>
              </div>
              <div>
                <span>Open quantity</span>
                <strong>{selectedTrade.remainingQuantity}</strong>
                <small>of {selectedTrade.quantity}</small>
              </div>
              <div>
                <span>Average entry</span>
                <strong>{money(selectedTrade.entryPrice)}</strong>
              </div>
              <div>
                <span>Open P/L</span>
                <strong
                  className={
                    selectedOpenPositionDetail?.status !== "available"
                      ? "muted-cell"
                      : selectedOpenPositionDetail.value >= 0
                        ? "positive"
                        : "negative"
                  }
                >
                  {selectedOpenPositionDetail?.status === "available"
                    ? money(selectedOpenPositionDetail.value)
                    : "Unavailable"}
                </strong>
                <small>
                  {selectedOpenPositionDetail?.status === "available"
                    ? `latest ${money(selectedOpenPositionDetail.latestPrice)}${
                        selectedOpenPositionDetail.quoteAsOf
                          ? ` as of ${shortDate(selectedOpenPositionDetail.quoteAsOf)}`
                          : ""
                      }`
                    : selectedOpenPositionDetail?.message}
                </small>
              </div>
              <div>
                <span>Realized P/L</span>
                <strong
                  className={
                    selectedTrade.returnAmount === null
                      ? "muted-cell"
                      : selectedTrade.returnAmount >= 0
                        ? "positive"
                        : "negative"
                  }
                >
                  {money(selectedTrade.returnAmount)}
                </strong>
                <small>{percent(selectedTrade.returnPercent)}</small>
              </div>
            </div>
            <div className="trade-detail-content-grid">
              <section className="trade-detail-section" aria-labelledby="position-details-title">
                <h3 id="position-details-title">Position Details</h3>
                <dl className="position-detail-list">
                  <div>
                    <dt>Side</dt>
                    <dd>{selectedTrade.side}</dd>
                  </div>
                  <div>
                    <dt>Asset class</dt>
                    <dd>{selectedTrade.assetClass}</dd>
                  </div>
                  <div>
                    <dt>Open market value</dt>
                    <dd>{money(openPositionMarketValue(selectedTrade, selectedOpenPositionPnl?.latestPrice))}</dd>
                  </div>
                  <div>
                    <dt>Last exit</dt>
                    <dd>{selectedTrade.exitPrice === null ? "Open" : money(selectedTrade.exitPrice)}</dd>
                  </div>
                  <div>
                    <dt>Total fees</dt>
                    <dd>{money(selectedTrade.fees)}</dd>
                  </div>
                  <div>
                    <dt>Executions</dt>
                    <dd>{selectedTrade.executions.length}</dd>
                  </div>
                </dl>
              </section>
              <section className="trade-detail-section execution-section" aria-labelledby="execution-history-title">
                <h3 id="execution-history-title">Execution History</h3>
                <div className="execution-list">
                  {selectedTrade.executions.length > 0 ? (
                    selectedTrade.executions.map((execution, index) => (
                      <div className="execution-row" key={execution.id ?? `${execution.action}-${index}`}>
                        <span className={execution.action === "BUY" ? "badge badge-success" : "badge badge-danger"}>
                          {execution.action}
                        </span>
                        <div>
                          <strong>
                            {execution.quantity} @ {money(execution.price)}
                          </strong>
                          <small>{displayDateTime(execution.executedAt)}</small>
                        </div>
                        <span>{money(execution.fees)} fees</span>
                      </div>
                    ))
                  ) : (
                    <p className="muted-cell">No execution history recorded.</p>
                  )}
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button
                className="secondary-button danger-button"
                disabled={busy}
                onClick={() => deleteTrade(selectedTrade.id)}
                type="button"
              >
                Delete
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => openEditModal(selectedTrade)}
                type="button"
              >
                Edit Details
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => openAddBuyModal(selectedTrade)}
                type="button"
              >
                {openingActionForSide(selectedTrade.side) === "BUY" ? "Add Buy" : "Add Execution"}
              </button>
              {selectedTrade.status === "OPEN" && selectedTrade.remainingQuantity > 0 ? (
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => openSellModal(selectedTrade)}
                  type="button"
                >
                  Record Sell
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {modalMode === "buy" || modalMode === "addBuy" || modalMode === "edit" ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="trade-modal-title"
            aria-modal="true"
            className="modal-panel"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {modalMode === "edit"
                    ? "Edit Details"
                    : modalMode === "addBuy"
                      ? "Add Execution"
                      : "Manual Trade"}
                </p>
                <h2 id="trade-modal-title">
                  {modalMode === "edit"
                    ? "Edit Trade Details"
                    : modalMode === "addBuy"
                      ? openingActionForSide(form.side) === "BUY"
                        ? "Add Buy"
                        : "Add Execution"
                      : "Add Trade / Buy"}
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

            <form className="entry-form" onSubmit={submitTrade}>
              <label>
                Asset class
                <select
                  disabled={modalMode === "addBuy"}
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
                  disabled={modalMode === "addBuy"}
                  name="symbol"
                  onChange={(event) => updateField("symbol", event.target.value)}
                  placeholder="AAPL"
                  required
                  value={form.symbol}
                />
              </label>
              {modalMode === "buy" ? (
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
              ) : null}
              <label>
                {modalMode === "edit"
                  ? "Opening quantity"
                  : openingActionForSide(form.side) === "BUY"
                    ? "Buy quantity"
                    : "Execution quantity"}
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
                {modalMode === "edit"
                  ? "Opening date/time"
                  : openingActionForSide(form.side) === "BUY"
                    ? "Buy date/time"
                    : "Execution date/time"}
                <input
                  name="entryDateTime"
                  onChange={(event) => updateField("entryDateTime", event.target.value)}
                  required
                  type="datetime-local"
                  value={form.entryDateTime}
                />
              </label>
              <label>
                {modalMode === "edit"
                  ? "Opening price"
                  : openingActionForSide(form.side) === "BUY"
                    ? "Buy price"
                    : "Execution price"}
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
                Opening fees
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
                  {modalMode === "edit"
                    ? "Save Details"
                    : modalMode === "addBuy"
                      ? openingActionForSide(form.side) === "BUY"
                        ? "Add Buy"
                        : "Add Execution"
                      : "Add Trade"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {modalMode === "sell" && selectedTrade ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="sell-modal-title"
            aria-modal="true"
            className="modal-panel"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Exit Execution</p>
                <h2 id="sell-modal-title">Record Sell</h2>
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
            <form className="entry-form" onSubmit={submitSell}>
              <div className="span-full segmented" role="group" aria-label="Sell type">
                <button
                  aria-pressed={sellForm.mode === "partial"}
                  onClick={() => updateSellField("mode", "partial")}
                  type="button"
                >
                  Partial Sell
                </button>
                <button
                  aria-pressed={sellForm.mode === "full"}
                  onClick={() => updateSellField("mode", "full")}
                  type="button"
                >
                  Full Sell
                </button>
              </div>
              <label>
                Sell quantity
                <input
                  disabled={sellForm.mode === "full"}
                  max={selectedTrade.remainingQuantity}
                  min="1"
                  name="sellQuantity"
                  onChange={(event) => updateSellField("quantity", event.target.value)}
                  required
                  step="1"
                  type="number"
                  value={
                    sellForm.mode === "full"
                      ? String(selectedTrade.remainingQuantity)
                      : sellForm.quantity
                  }
                />
              </label>
              <label>
                Sell date/time
                <input
                  name="sellDateTime"
                  onChange={(event) => updateSellField("executedAt", event.target.value)}
                  required
                  type="datetime-local"
                  value={sellForm.executedAt}
                />
              </label>
              <label>
                Sell price
                <input
                  min="0"
                  name="sellPrice"
                  onChange={(event) => updateSellField("price", event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={sellForm.price}
                />
              </label>
              <label>
                Sell fees
                <input
                  min="0"
                  name="sellFees"
                  onChange={(event) => updateSellField("fees", event.target.value)}
                  step="0.01"
                  type="number"
                  value={sellForm.fees}
                />
              </label>
              <p className="form-help span-full">
                Open quantity: {selectedTrade.remainingQuantity}. Full sell records the entire
                remaining position.
              </p>
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
                  Record Sell
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </article>
  );
}
