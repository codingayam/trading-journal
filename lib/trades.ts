import type { Prisma, Trade } from "@prisma/client";

const assetClasses = new Set(["Stock", "Option", "Crypto", "Forex", "Futures", "Other"]);
const sides = new Set(["LONG", "SHORT"]);
const statuses = new Set(["OPEN", "CLOSED"]);

type TradeInputMode = "create" | "update";

type ParsedTradeInput = {
  assetClass?: string;
  tradeDate?: Date;
  symbol?: string;
  side?: string;
  quantity?: number;
  entryPrice?: string;
  exitDate?: Date | null;
  exitPrice?: string | null;
  fees?: string;
  status?: string;
  grossPnl?: string | null;
};

function decimalString(value: number) {
  return value.toFixed(2);
}

function numberFromDecimal(value: unknown) {
  return Number(value ?? 0);
}

function parseRequiredString(value: unknown, field: string, errors: string[]) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} is required.`);
    return undefined;
  }

  return value.trim();
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function parseDate(value: unknown, field: string, errors: string[]) {
  const raw = parseRequiredString(value, field, errors);
  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} must be a valid date/time.`);
    return undefined;
  }

  return date;
}

function parseOptionalDate(value: unknown, field: string, errors: string[]) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} must be a valid date/time.`);
    return undefined;
  }

  return date;
}

function parsePositiveNumber(value: unknown, field: string, errors: string[]) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push(`${field} must be greater than zero.`);
    return undefined;
  }

  return amount;
}

function parseNonNegativeNumber(value: unknown, field: string, errors: string[]) {
  const amount = value === undefined || value === null || value === "" ? 0 : Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    errors.push(`${field} must be zero or greater.`);
    return undefined;
  }

  return amount;
}

function calculateGrossPnl(input: {
  status: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitDate?: Date | null;
  exitPrice?: number | null;
  fees: number;
}) {
  if (
    input.status === "OPEN" ||
    !input.exitDate ||
    input.exitPrice === undefined ||
    input.exitPrice === null
  ) {
    return null;
  }

  const priceDelta =
    input.side === "SHORT"
      ? input.entryPrice - input.exitPrice
      : input.exitPrice - input.entryPrice;

  return decimalString(priceDelta * input.quantity - input.fees);
}

export function returnPercentForTrade(input: {
  status: string;
  grossPnl: unknown;
  entryPrice: unknown;
  quantity: number;
}) {
  if (input.status === "OPEN" || input.grossPnl === null || input.grossPnl === undefined) {
    return null;
  }

  const basis = numberFromDecimal(input.entryPrice) * input.quantity;
  if (basis <= 0) {
    return null;
  }

  return Number(((numberFromDecimal(input.grossPnl) / basis) * 100).toFixed(2));
}

export function serializeTrade(trade: Trade) {
  const realizedPnl =
    trade.status === "OPEN" || !trade.exitDate || !trade.exitPrice
      ? null
      : trade.grossPnl;

  return {
    id: trade.id,
    assetClass: trade.assetClass,
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    entryDateTime: trade.tradeDate.toISOString(),
    entryPrice: numberFromDecimal(trade.entryPrice),
    exitDateTime: trade.exitDate?.toISOString() ?? null,
    exitPrice: trade.exitPrice === null ? null : numberFromDecimal(trade.exitPrice),
    fees: numberFromDecimal(trade.fees),
    status: trade.status,
    grossPnl: realizedPnl === null ? null : numberFromDecimal(realizedPnl),
    returnAmount: realizedPnl === null ? null : numberFromDecimal(realizedPnl),
    returnPercent: returnPercentForTrade({ ...trade, grossPnl: realizedPnl }),
    createdAt: trade.createdAt.toISOString(),
    updatedAt: trade.updatedAt.toISOString(),
  };
}

export function parseTradeInput(
  body: unknown,
  mode: TradeInputMode,
  existing?: {
    assetClass: string;
    tradeDate: Date;
    symbol: string;
    side: string;
    quantity: number;
    entryPrice: Prisma.Decimal;
    exitDate: Date | null;
    exitPrice: Prisma.Decimal | null;
    fees: Prisma.Decimal;
    status: string;
  },
) {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const errors: string[] = [];
  const parsed: ParsedTradeInput = {};
  const required = mode === "create";

  const assetClass = required
    ? parseRequiredString(input.assetClass, "assetClass", errors)
    : parseOptionalString(input.assetClass);
  if (assetClass !== undefined) {
    if (!assetClasses.has(assetClass)) {
      errors.push("assetClass is not supported.");
    } else {
      parsed.assetClass = assetClass;
    }
  }

  const symbol = required
    ? parseRequiredString(input.symbol, "symbol", errors)
    : parseOptionalString(input.symbol);
  if (symbol !== undefined) {
    parsed.symbol = symbol.toUpperCase();
  }

  const side = required
    ? parseRequiredString(input.side, "side", errors)
    : parseOptionalString(input.side);
  if (side !== undefined) {
    const normalized = side.toUpperCase();
    if (!sides.has(normalized)) {
      errors.push("side must be LONG or SHORT.");
    } else {
      parsed.side = normalized;
    }
  }

  const status = required
    ? parseRequiredString(input.status, "status", errors)
    : parseOptionalString(input.status);
  if (status !== undefined) {
    const normalized = status.toUpperCase();
    if (!statuses.has(normalized)) {
      errors.push("status must be OPEN or CLOSED.");
    } else {
      parsed.status = normalized;
    }
  }

  if (required || input.entryDateTime !== undefined || input.tradeDate !== undefined) {
    parsed.tradeDate = parseDate(
      input.entryDateTime ?? input.tradeDate,
      "entryDateTime",
      errors,
    );
  }

  if (required || input.quantity !== undefined) {
    const quantity = parsePositiveNumber(input.quantity, "quantity", errors);
    if (quantity !== undefined && !Number.isInteger(quantity)) {
      errors.push("quantity must be a whole number.");
    } else if (quantity !== undefined) {
      parsed.quantity = quantity;
    }
  }

  if (required || input.entryPrice !== undefined) {
    const entryPrice = parsePositiveNumber(input.entryPrice, "entryPrice", errors);
    if (entryPrice !== undefined) {
      parsed.entryPrice = decimalString(entryPrice);
    }
  }

  if (input.exitDateTime !== undefined || input.exitDate !== undefined) {
    parsed.exitDate =
      input.exitDateTime === null || input.exitDateTime === "" || input.exitDate === null
        ? null
        : parseOptionalDate(input.exitDateTime ?? input.exitDate, "exitDateTime", errors);
  }

  if (input.exitPrice !== undefined) {
    if (input.exitPrice === null || input.exitPrice === "") {
      parsed.exitPrice = null;
    } else {
      const exitPrice = parsePositiveNumber(input.exitPrice, "exitPrice", errors);
      if (exitPrice !== undefined) {
        parsed.exitPrice = decimalString(exitPrice);
      }
    }
  }

  if (required || input.fees !== undefined) {
    const fees = parseNonNegativeNumber(input.fees, "fees", errors);
    if (fees !== undefined) {
      parsed.fees = decimalString(fees);
    }
  }

  const merged = {
    side: parsed.side ?? existing?.side,
    quantity: parsed.quantity ?? existing?.quantity,
    entryPrice: parsed.entryPrice ?? existing?.entryPrice?.toString(),
    exitDate: parsed.exitDate !== undefined ? parsed.exitDate : existing?.exitDate,
    exitPrice: parsed.exitPrice !== undefined ? parsed.exitPrice : existing?.exitPrice?.toString(),
    fees: parsed.fees ?? existing?.fees?.toString() ?? "0",
    status: parsed.status ?? existing?.status ?? "OPEN",
  };

  if (
    merged.side &&
    merged.quantity !== undefined &&
    merged.entryPrice !== undefined &&
    merged.fees !== undefined
  ) {
    parsed.grossPnl = calculateGrossPnl({
      status: merged.status,
      side: merged.side,
      quantity: merged.quantity,
      entryPrice: Number(merged.entryPrice),
      exitDate: merged.exitDate,
      exitPrice: merged.exitPrice === null || merged.exitPrice === undefined
        ? null
        : Number(merged.exitPrice),
      fees: Number(merged.fees),
    });
  }

  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  return { ok: true as const, data: parsed };
}
