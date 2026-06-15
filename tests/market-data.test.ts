import assert from "node:assert/strict";
import {
  YahooChartEodQuoteProvider,
  calculateOpenPositionPnl,
  getOpenPositionPnlForTrades,
  parseYahooChartQuote,
  type LatestEodQuoteProvider,
  type LatestEodQuoteResult,
} from "../lib/market-data";
import type { ParsedExecutionInput } from "../lib/trades";

function execution(input: {
  action: "BUY" | "SELL";
  executedAt: string;
  quantity: number;
  price: number;
  fees?: number;
}): ParsedExecutionInput {
  return {
    action: input.action,
    executedAt: new Date(input.executedAt),
    quantity: input.quantity,
    price: input.price.toFixed(2),
    fees: (input.fees ?? 0).toFixed(2),
  };
}

function quote(symbol: string, price: number): LatestEodQuoteResult {
  return {
    status: "available",
    quote: {
      symbol,
      price,
      currency: "USD",
      asOf: "2026-06-12T13:30:00.000Z",
      source: "yahoo-chart",
    },
  };
}

async function run() {
  const longOpen = calculateOpenPositionPnl({
    symbol: "aapl",
    side: "LONG",
    executions: [
      execution({ action: "BUY", executedAt: "2026-06-10T14:00:00.000Z", quantity: 100, price: 10 }),
      execution({ action: "BUY", executedAt: "2026-06-10T14:30:00.000Z", quantity: 50, price: 12 }),
      execution({ action: "SELL", executedAt: "2026-06-10T15:00:00.000Z", quantity: 80, price: 15 }),
    ],
    quoteResult: quote("AAPL", 18),
  });
  assert.equal(longOpen.status, "available");
  assert.equal(longOpen.remainingQuantity, 70);
  assert.equal(longOpen.averageEntryPrice, 10.67);
  assert.equal(longOpen.latestPrice, 18);
  assert.equal(longOpen.unrealizedPnl, 513.1);

  const shortOpen = calculateOpenPositionPnl({
    symbol: "tsla",
    side: "SHORT",
    executions: [
      execution({ action: "SELL", executedAt: "2026-06-11T14:00:00.000Z", quantity: 10, price: 100 }),
      execution({ action: "BUY", executedAt: "2026-06-11T15:00:00.000Z", quantity: 4, price: 90 }),
    ],
    quoteResult: quote("TSLA", 80),
  });
  assert.equal(shortOpen.status, "available");
  assert.equal(shortOpen.remainingQuantity, 6);
  assert.equal(shortOpen.latestPrice, 80);
  assert.equal(shortOpen.unrealizedPnl, 120);

  const missingQuote = calculateOpenPositionPnl({
    symbol: "MSFT",
    side: "LONG",
    executions: [execution({ action: "BUY", executedAt: "2026-06-12T14:00:00.000Z", quantity: 5, price: 20 })],
    quoteResult: {
      status: "unavailable",
      symbol: "MSFT",
      reason: "no_eod_price",
      message: "No usable latest daily close was returned for this symbol.",
    },
  });
  assert.deepEqual(missingQuote, {
    status: "unavailable",
    symbol: "MSFT",
    side: "LONG",
    remainingQuantity: 5,
    latestPrice: null,
    unrealizedPnl: null,
    reason: "no_eod_price",
    message: "No usable latest daily close was returned for this symbol.",
  });

  const providerCalls: string[] = [];
  const fakeProvider: LatestEodQuoteProvider = {
    async getLatestEodQuote(symbol) {
      providerCalls.push(symbol);

      if (symbol === "MISSING") {
        return {
          status: "unavailable",
          symbol,
          reason: "not_found",
          message: "Yahoo Finance chart endpoint returned HTTP 404.",
        };
      }

      return quote(symbol, symbol === "AAPL" ? 22 : 80);
    },
  };

  const openPnlRows = await getOpenPositionPnlForTrades(
    [
      {
        id: "open-aapl",
        symbol: "AAPL",
        side: "LONG",
        status: "OPEN",
        remainingQuantity: 8,
        executions: [
          execution({ action: "BUY", executedAt: "2026-06-12T14:00:00.000Z", quantity: 10, price: 20 }),
          execution({ action: "SELL", executedAt: "2026-06-12T15:00:00.000Z", quantity: 2, price: 21 }),
        ],
      },
      {
        id: "open-missing",
        symbol: "MISSING",
        side: "LONG",
        status: "OPEN",
        remainingQuantity: 3,
        executions: [execution({ action: "BUY", executedAt: "2026-06-12T14:00:00.000Z", quantity: 3, price: 10 })],
      },
      {
        id: "closed-msft",
        symbol: "MSFT",
        side: "LONG",
        status: "CLOSED",
        remainingQuantity: 0,
        executions: [execution({ action: "BUY", executedAt: "2026-06-12T14:00:00.000Z", quantity: 1, price: 20 })],
      },
    ],
    fakeProvider,
  );

  assert.deepEqual(providerCalls, ["AAPL", "MISSING"]);
  assert.deepEqual(openPnlRows, [
    {
      tradeId: "open-aapl",
      symbol: "AAPL",
      status: "available",
      side: "LONG",
      remainingQuantity: 8,
      averageEntryPrice: 20,
      latestPrice: 22,
      unrealizedPnl: 16,
      quoteAsOf: "2026-06-12T13:30:00.000Z",
      message: undefined,
    },
    {
      tradeId: "open-missing",
      symbol: "MISSING",
      status: "unavailable",
      side: "LONG",
      remainingQuantity: 3,
      averageEntryPrice: undefined,
      latestPrice: null,
      unrealizedPnl: null,
      quoteAsOf: undefined,
      message: "Yahoo Finance chart endpoint returned HTTP 404.",
    },
  ]);

  const parsedQuote = parseYahooChartQuote("AAPL", {
    chart: {
      result: [
        {
          meta: { currency: "USD" },
          timestamp: [1781260200, 1781346600, 1781605800],
          indicators: {
            quote: [{ close: [195.2, null, 198.34] }],
          },
        },
      ],
    },
  });
  assert.deepEqual(parsedQuote, {
    status: "available",
    quote: {
      symbol: "AAPL",
      price: 198.34,
      currency: "USD",
      asOf: "2026-06-16T10:30:00.000Z",
      source: "yahoo-chart",
    },
  });

  const parsedUnavailable = parseYahooChartQuote("EMPTY", {
    chart: {
      result: [
        {
          timestamp: [1781260200],
          indicators: {
            quote: [{ close: [null] }],
          },
        },
      ],
    },
  });
  assert.equal(parsedUnavailable.status, "unavailable");
  assert.equal(parsedUnavailable.reason, "no_eod_price");

  const requests: string[] = [];
  const provider = new YahooChartEodQuoteProvider({
    fetcher: async (input) => {
      requests.push(String(input));
      return Response.json({
        chart: {
          result: [
            {
              meta: { currency: "USD" },
              timestamp: [1781260200],
              indicators: {
                quote: [{ close: [210.111] }],
              },
            },
          ],
        },
      });
    },
  });

  const fetchedQuote = await provider.getLatestEodQuote(" aapl ");
  assert.equal(fetchedQuote.status, "available");
  assert.equal(fetchedQuote.quote.price, 210.11);
  assert.match(requests[0], /query1\.finance\.yahoo\.com\/v8\/finance\/chart\/AAPL/);
  assert.match(requests[0], /range=10d/);
  assert.match(requests[0], /interval=1d/);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
