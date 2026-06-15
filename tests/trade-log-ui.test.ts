import assert from "node:assert/strict";
import {
  appendSellExecutionPayload,
  createOpeningExecutionPayload,
  openPositionMarketValue,
  pageCountForTrades,
  paginatedTrades,
  reducingActionForSide,
  tradesPerPage,
  type SellFormState,
  type TradeFormState,
  type TradeRecord,
} from "../app/trade-log";

function trade(index: number, overrides: Partial<TradeRecord> = {}): TradeRecord {
  const id = `trade-${index}`;

  return {
    id,
    assetClass: "Stock",
    symbol: `T${index}`,
    side: "LONG",
    quantity: 100,
    remainingQuantity: 100,
    entryDateTime: `2026-06-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`,
    entryPrice: 10,
    exitDateTime: null,
    exitPrice: null,
    fees: 0,
    status: "OPEN",
    returnAmount: null,
    returnPercent: null,
    executions: [
      {
        id: `${id}-buy`,
        action: "BUY",
        executedAt: `2026-06-${String(index + 1).padStart(2, "0")}T14:00:00.000Z`,
        quantity: 100,
        price: 10,
        fees: 0,
      },
    ],
    ...overrides,
  };
}

function run() {
  const trades = Array.from({ length: 12 }, (_, index) => trade(index));
  assert.equal(tradesPerPage, 10);
  assert.equal(pageCountForTrades(trades.length), 2);
  assert.equal(paginatedTrades(trades, 1).length, 10);
  assert.equal(paginatedTrades(trades, 2).length, 2);
  assert.equal(paginatedTrades(trades, 3)[0].id, "trade-10");
  assert.equal(openPositionMarketValue(trade(99, { entryPrice: 17.25, remainingQuantity: 8 })), 138);

  const buyForm: TradeFormState = {
    assetClass: "Stock",
    symbol: "AAPL",
    side: "LONG",
    quantity: "25",
    entryDateTime: "2026-06-15T14:30",
    entryPrice: "190.50",
    fees: "1.25",
  };
  assert.deepEqual(createOpeningExecutionPayload(buyForm), {
    action: "BUY",
    executedAt: "2026-06-15T14:30",
    quantity: 25,
    price: 190.5,
    fees: 1.25,
  });

  assert.equal(reducingActionForSide("LONG"), "SELL");
  assert.equal(reducingActionForSide("SHORT"), "BUY");

  const partialSell: SellFormState = {
    mode: "partial",
    quantity: "40",
    executedAt: "2026-06-15T15:00",
    price: "12.25",
    fees: "0.75",
  };
  const partialPayload = appendSellExecutionPayload(trade(1), partialSell);
  assert.equal(partialPayload.length, 2);
  assert.deepEqual(partialPayload.at(-1), {
    action: "SELL",
    executedAt: "2026-06-15T15:00",
    quantity: 40,
    price: 12.25,
    fees: 0.75,
  });

  const fullSell: SellFormState = {
    mode: "full",
    quantity: "1",
    executedAt: "2026-06-15T16:00",
    price: "13",
    fees: "0",
  };
  assert.equal(appendSellExecutionPayload(trade(2, { remainingQuantity: 60 }), fullSell).at(-1)?.quantity, 60);
}

run();
