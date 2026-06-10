import assert from "node:assert/strict";
import {
  DashboardTrade,
  filterDashboardTrades,
  getDashboardSummary,
  getEquityPoints,
} from "../lib/dashboard";

const now = new Date("2026-06-10T12:00:00+08:00");

const seededTrades: DashboardTrade[] = [
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
assert.equal(allSummary.totalPnl, 109);
assert.equal(allSummary.wins, 2);
assert.equal(allSummary.losses, 1);
assert.equal(Math.round(allSummary.winRate), 67);
assert.equal(allSummary.averageWin, 71.5);
assert.equal(allSummary.averageLoss, -34);
assert.equal(allSummary.openTrades, 0);

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
  ],
);

assert.equal(filterDashboardTrades(seededTrades, "today", now).length, 0);
assert.equal(filterDashboardTrades(seededTrades, "week", now).length, 3);
assert.equal(filterDashboardTrades(seededTrades, "month", now).length, 3);
assert.equal(filterDashboardTrades(seededTrades, "year", now).length, 3);
assert.equal(filterDashboardTrades(seededTrades, "last-year", now).length, 0);
