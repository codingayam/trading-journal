import assert from "node:assert/strict";
import {
  filterDashboardTrades,
  getEquityChartModel,
  getDashboardSummary,
  getEquityPoints,
} from "../lib/dashboard";
import type { DashboardOpenPositionPnl, DashboardTrade } from "../lib/dashboard";

const now = new Date("2026-06-10T12:00:00+08:00");

const seededTrades: DashboardTrade[] = [
  {
    id: "trade-nvda-2026-06-10",
    symbol: "NVDA",
    side: "LONG",
    quantity: 5,
    entryDateTime: "2026-06-10T14:30:00.000Z",
    entryPrice: 143.2,
    exitDateTime: null,
    exitPrice: null,
    status: "OPEN",
    returnAmount: null,
    returnPercent: null,
  },
  {
    id: "trade-amzn-partial-2026-06-10",
    symbol: "AMZN",
    side: "LONG",
    quantity: 100,
    entryDateTime: "2026-06-10T13:35:00.000Z",
    entryPrice: 180,
    exitDateTime: "2026-06-10T14:05:00.000Z",
    exitPrice: 190,
    status: "OPEN",
    returnAmount: 400,
    returnPercent: 5.56,
  },
  {
    id: "trade-meta-2026-06-09",
    symbol: "META",
    side: "SHORT",
    quantity: 10,
    entryDateTime: "2026-06-09T13:40:00.000Z",
    entryPrice: 633.2,
    exitDateTime: "2026-06-09T14:05:00.000Z",
    exitPrice: 635,
    status: "CLOSED",
    returnAmount: -18,
    returnPercent: -0.28,
  },
  {
    id: "trade-msft-2026-06-08",
    symbol: "MSFT",
    side: "LONG",
    quantity: 20,
    entryDateTime: "2026-06-08T15:20:00.000Z",
    entryPrice: 470.5,
    exitDateTime: "2026-06-08T16:05:00.000Z",
    exitPrice: 468.8,
    status: "CLOSED",
    returnAmount: -34,
    returnPercent: -0.36,
  },
  {
    id: "trade-tsm-2026-06-09",
    symbol: "TSM",
    side: "LONG",
    quantity: 30,
    entryDateTime: "2026-06-09T02:15:00.000Z",
    entryPrice: 182.4,
    exitDateTime: "2026-06-09T03:00:00.000Z",
    exitPrice: 184,
    status: "CLOSED",
    returnAmount: 48,
    returnPercent: 0.88,
  },
  {
    id: "trade-aapl-2026-06-08",
    symbol: "AAPL",
    side: "LONG",
    quantity: 50,
    entryDateTime: "2026-06-08T14:05:00.000Z",
    entryPrice: 196.2,
    exitDateTime: "2026-06-08T15:10:00.000Z",
    exitPrice: 198.1,
    status: "CLOSED",
    returnAmount: 95,
    returnPercent: 0.97,
  },
];

const allSummary = getDashboardSummary(filterDashboardTrades(seededTrades, "all", now));
assert.equal(allSummary.totalPnl, 491);
assert.equal(allSummary.wins, 3);
assert.equal(allSummary.losses, 2);
assert.equal(Math.round(allSummary.winRate), 60);
assert.equal(allSummary.averageWin, 181);
assert.equal(allSummary.averageLoss, -26);
assert.equal(allSummary.openTrades, 2);
assert.equal(allSummary.closedTrades, 4);

assert.deepEqual(
  getEquityPoints(seededTrades).map((point) => ({
    symbol: point.symbol,
    pnl: point.pnl,
    equity: point.equity,
  })),
  [
    { symbol: "AAPL", pnl: 95, equity: 95 },
    { symbol: "MSFT", pnl: -34, equity: 61 },
    { symbol: "TSM", pnl: 48, equity: 109 },
    { symbol: "META", pnl: -18, equity: 91 },
    { symbol: "AMZN", pnl: 400, equity: 491 },
  ],
);

const openPositionPnl: DashboardOpenPositionPnl[] = [
  {
    tradeId: "trade-nvda-2026-06-10",
    symbol: "NVDA",
    status: "available",
    side: "LONG",
    remainingQuantity: 5,
    averageEntryPrice: 143.2,
    latestPrice: 150,
    unrealizedPnl: 34,
    quoteAsOf: "2026-06-12T13:30:00.000Z",
  },
  {
    tradeId: "trade-amzn-partial-2026-06-10",
    symbol: "AMZN",
    status: "available",
    side: "LONG",
    remainingQuantity: 60,
    averageEntryPrice: 180,
    latestPrice: 191,
    unrealizedPnl: 660,
    quoteAsOf: "2026-06-12T13:30:00.000Z",
  },
  {
    tradeId: "trade-missing-quote",
    symbol: "MSFT",
    status: "unavailable",
    side: "LONG",
    remainingQuantity: 5,
    latestPrice: null,
    unrealizedPnl: null,
    message: "No usable latest daily close was returned for this symbol.",
  },
];

const chartModel = getEquityChartModel(seededTrades, openPositionPnl);
assert.deepEqual(
  chartModel.closed.map((point) => ({
    symbol: point.symbol,
    absoluteValue: point.absoluteValue,
    percentValue: point.percentValue,
    pointPercent: point.pointPercent,
  })),
  [
    { symbol: "AAPL", absoluteValue: 95, percentValue: 0.97, pointPercent: 0.97 },
    { symbol: "MSFT", absoluteValue: 61, percentValue: 0.32, pointPercent: -0.36 },
    { symbol: "TSM", absoluteValue: 109, percentValue: 0.44, pointPercent: 0.88 },
    { symbol: "META", absoluteValue: 91, percentValue: 0.29, pointPercent: -0.28 },
    { symbol: "AMZN", absoluteValue: 491, percentValue: 1.28, pointPercent: 5.56 },
  ],
);
assert.deepEqual(
  chartModel.open.map((point) => ({
    symbol: point.symbol,
    pnl: point.pnl,
    absoluteValue: point.absoluteValue,
    percentValue: point.percentValue,
    pointPercent: point.pointPercent,
  })),
  [
    { symbol: "AMZN", pnl: 660, absoluteValue: 660, percentValue: 6.11, pointPercent: 6.11 },
    { symbol: "NVDA", pnl: 34, absoluteValue: 694, percentValue: 6.03, pointPercent: 4.75 },
  ],
);
assert.deepEqual(chartModel.unavailableOpen, [
  {
    tradeId: "trade-missing-quote",
    symbol: "MSFT",
    message: "No usable latest daily close was returned for this symbol.",
  },
]);

assert.equal(filterDashboardTrades(seededTrades, "today", now).length, 2);
assert.equal(filterDashboardTrades(seededTrades, "week", now).length, 6);
assert.equal(filterDashboardTrades(seededTrades, "month", now).length, 6);
assert.equal(filterDashboardTrades(seededTrades, "year", now).length, 6);
assert.equal(filterDashboardTrades(seededTrades, "last-year", now).length, 0);
