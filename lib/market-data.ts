import { deriveExecutionSnapshot, type ParsedExecutionInput } from "./trades";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

export type LatestEodQuote = {
  symbol: string;
  price: number;
  currency: string | null;
  asOf: string;
  source: "yahoo-chart";
};

export type QuoteUnavailableReason =
  | "invalid_symbol"
  | "not_found"
  | "no_eod_price"
  | "provider_error";

export type LatestEodQuoteResult =
  | {
      status: "available";
      quote: LatestEodQuote;
    }
  | {
      status: "unavailable";
      symbol: string;
      reason: QuoteUnavailableReason;
      message: string;
    };

export type LatestEodQuoteProvider = {
  getLatestEodQuote(symbol: string): Promise<LatestEodQuoteResult>;
};

// Server-side Yahoo Finance compatible source. This uses the public chart
// endpoint through Node/Next fetch so the first pass needs no adapter package,
// API key, paid provider, or local quote cache. Each call fetches on demand;
// there is no stored snapshot or background market-hours polling in this pass.
export class YahooChartEodQuoteProvider implements LatestEodQuoteProvider {
  private readonly fetcher: FetchLike;
  private readonly baseUrl: string;

  constructor(options: { fetcher?: FetchLike; baseUrl?: string } = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.baseUrl = options.baseUrl ?? "https://query1.finance.yahoo.com";
  }

  async getLatestEodQuote(symbol: string): Promise<LatestEodQuoteResult> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!normalizedSymbol) {
      return {
        status: "unavailable",
        symbol,
        reason: "invalid_symbol",
        message: "Symbol is required before fetching latest EOD quote data.",
      };
    }

    const url = new URL(`/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}`, this.baseUrl);
    url.searchParams.set("range", "10d");
    url.searchParams.set("interval", "1d");

    try {
      const response = await this.fetcher(url);
      if (!response.ok) {
        return {
          status: "unavailable",
          symbol: normalizedSymbol,
          reason: response.status === 404 ? "not_found" : "provider_error",
          message: `Yahoo Finance chart endpoint returned HTTP ${response.status}.`,
        };
      }

      const payload = (await response.json()) as YahooChartResponse;
      return parseYahooChartQuote(normalizedSymbol, payload);
    } catch (error) {
      return {
        status: "unavailable",
        symbol: normalizedSymbol,
        reason: "provider_error",
        message: error instanceof Error ? error.message : "Quote provider request failed.",
      };
    }
  }
}

export function parseYahooChartQuote(
  symbol: string,
  payload: YahooChartResponse,
): LatestEodQuoteResult {
  const error = payload.chart?.error;
  if (error) {
    return {
      status: "unavailable",
      symbol,
      reason: "provider_error",
      message: error.description ?? error.code ?? "Yahoo Finance chart endpoint returned an error.",
    };
  }

  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  for (let index = closes.length - 1; index >= 0; index -= 1) {
    const price = closes[index];
    const timestamp = timestamps[index];
    if (Number.isFinite(price) && price !== null && price > 0 && Number.isFinite(timestamp)) {
      return {
        status: "available",
        quote: {
          symbol,
          price: roundMoney(price),
          currency: result?.meta?.currency ?? null,
          asOf: new Date(timestamp * 1000).toISOString(),
          source: "yahoo-chart",
        },
      };
    }
  }

  return {
    status: "unavailable",
    symbol,
    reason: "no_eod_price",
    message: "No usable latest daily close was returned for this symbol.",
  };
}

export type OpenPositionPnlResult =
  | {
      status: "available";
      symbol: string;
      side: string;
      remainingQuantity: number;
      averageEntryPrice: number;
      latestPrice: number;
      unrealizedPnl: number;
      quote: LatestEodQuote;
    }
  | {
      status: "unavailable";
      symbol: string;
      side: string;
      remainingQuantity: number;
      latestPrice: null;
      unrealizedPnl: null;
      reason: "closed_position" | "invalid_execution_model" | QuoteUnavailableReason;
      message: string;
    };

export function calculateOpenPositionPnl(input: {
  symbol: string;
  side: string;
  executions: ParsedExecutionInput[];
  quoteResult: LatestEodQuoteResult;
}): OpenPositionPnlResult {
  const side = input.side.toUpperCase();
  const snapshot = deriveExecutionSnapshot(side, input.executions);
  const remainingQuantity = snapshot.remainingQuantity;

  if (side !== "LONG" && side !== "SHORT") {
    return {
      status: "unavailable",
      symbol: input.symbol.toUpperCase(),
      side,
      remainingQuantity,
      latestPrice: null,
      unrealizedPnl: null,
      reason: "invalid_execution_model",
      message: "Open P&L requires side to be LONG or SHORT.",
    };
  }

  if (snapshot.errors.length > 0 || snapshot.averageEntryPrice === null) {
    return {
      status: "unavailable",
      symbol: input.symbol.toUpperCase(),
      side,
      remainingQuantity,
      latestPrice: null,
      unrealizedPnl: null,
      reason: "invalid_execution_model",
      message: snapshot.errors.join(" ") || "Open P&L requires a valid execution model.",
    };
  }

  if (remainingQuantity <= 0) {
    return {
      status: "unavailable",
      symbol: input.symbol.toUpperCase(),
      side,
      remainingQuantity,
      latestPrice: null,
      unrealizedPnl: null,
      reason: "closed_position",
      message: "Open P&L is unavailable because the position has no remaining quantity.",
    };
  }

  if (input.quoteResult.status === "unavailable") {
    return {
      status: "unavailable",
      symbol: input.symbol.toUpperCase(),
      side,
      remainingQuantity,
      latestPrice: null,
      unrealizedPnl: null,
      reason: input.quoteResult.reason,
      message: input.quoteResult.message,
    };
  }

  const priceDelta =
    side === "SHORT"
      ? snapshot.averageEntryPrice - input.quoteResult.quote.price
      : input.quoteResult.quote.price - snapshot.averageEntryPrice;

  return {
    status: "available",
    symbol: input.symbol.toUpperCase(),
    side,
    remainingQuantity,
    averageEntryPrice: snapshot.averageEntryPrice,
    latestPrice: input.quoteResult.quote.price,
    unrealizedPnl: roundMoney(priceDelta * remainingQuantity),
    quote: input.quoteResult.quote,
  };
}

export const latestEodQuoteProvider = new YahooChartEodQuoteProvider();

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
