import assert from "node:assert/strict";
import { buildMonthlyPnlCalendar, dateKey, type CalendarTrade } from "../lib/pnl-calendar";

const trades: CalendarTrade[] = [
  {
    id: "trade-aapl-2026-06-08",
    symbol: "AAPL",
    side: "LONG",
    quantity: 50,
    entryDateTime: "2026-06-08T14:05:00.000Z",
    exitDateTime: "2026-06-08T15:10:00.000Z",
    status: "CLOSED",
    returnAmount: 95,
    returnPercent: 0.97,
  },
  {
    id: "trade-msft-2026-06-08",
    symbol: "MSFT",
    side: "LONG",
    quantity: 20,
    entryDateTime: "2026-06-08T15:20:00.000Z",
    exitDateTime: "2026-06-08T16:05:00.000Z",
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
    exitDateTime: "2026-06-09T03:00:00.000Z",
    status: "CLOSED",
    returnAmount: 48,
    returnPercent: 0.88,
  },
  {
    id: "trade-meta-2026-06-09",
    symbol: "META",
    side: "SHORT",
    quantity: 10,
    entryDateTime: "2026-06-09T13:40:00.000Z",
    exitDateTime: "2026-06-09T14:05:00.000Z",
    status: "CLOSED",
    returnAmount: -18,
    returnPercent: -0.28,
  },
  {
    id: "trade-open",
    symbol: "NVDA",
    side: "LONG",
    quantity: 2,
    entryDateTime: "2026-06-10T12:00:00.000Z",
    exitDateTime: null,
    status: "OPEN",
    returnAmount: null,
    returnPercent: null,
  },
  {
    id: "trade-amzn-partial",
    symbol: "AMZN",
    side: "LONG",
    quantity: 100,
    entryDateTime: "2026-06-10T13:35:00.000Z",
    exitDateTime: "2026-06-10T14:05:00.000Z",
    status: "OPEN",
    returnAmount: 400,
    returnPercent: 5.56,
  },
];

const june = buildMonthlyPnlCalendar(trades, 2026, 5);
assert.equal(june.monthPnl, 491);
assert.equal(june.tradeCount, 5);

const june8 = june.days.find((day) => day.dateKey === "2026-06-08");
assert.ok(june8);
assert.equal(june8.pnl, 95);
assert.equal(june8.tradeCount, 1);
assert.deepEqual(
  june8.trades.map((trade) => trade.symbol),
  ["AAPL"],
);

const june9 = june.days.find((day) => day.dateKey === "2026-06-09");
assert.ok(june9);
assert.equal(june9.pnl, -4);
assert.equal(june9.tradeCount, 3);
assert.deepEqual(
  june9.trades.map((trade) => trade.symbol),
  ["MSFT", "TSM", "META"],
);

const june10 = june.days.find((day) => day.dateKey === "2026-06-10");
assert.ok(june10);
assert.equal(june10.pnl, 400);
assert.equal(june10.tradeCount, 1);
assert.deepEqual(
  june10.trades.map((trade) => trade.symbol),
  ["AMZN"],
);

const july = buildMonthlyPnlCalendar(trades, 2026, 6);
assert.equal(july.monthPnl, 0);
assert.equal(july.tradeCount, 0);
assert.ok(july.days.every((day) => day.tradeCount === 0));

assert.equal(dateKey(new Date(2026, 5, 8)), "2026-06-08");
