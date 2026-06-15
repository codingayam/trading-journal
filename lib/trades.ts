import type { Prisma, Trade, TradeExecution } from "@prisma/client";

const assetClasses = new Set(["Stock", "Option", "Crypto", "Forex", "Futures", "Other"]);
const sides = new Set(["LONG", "SHORT"]);
const statuses = new Set(["OPEN", "CLOSED"]);
const executionActions = new Set(["BUY", "SELL"]);

type TradeInputMode = "create" | "update";

export type ParsedExecutionInput = {
  id?: string;
  action: string;
  executedAt: Date;
  quantity: number;
  price: string;
  fees: string;
};

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
  executions?: ParsedExecutionInput[];
};

type ExecutionLike = {
  id?: string;
  action: string;
  executedAt: Date;
  quantity: number;
  price: unknown;
  fees: unknown;
};

export type TradeWithExecutions = Trade & {
  executions: TradeExecution[];
};

export type ExecutionSnapshot = {
  errors: string[];
  totalQuantity: number;
  closedQuantity: number;
  remainingQuantity: number;
  averageEntryPrice: number | null;
  realizedPnl: number | null;
  status: string;
  exitDate: Date | null;
  exitPrice: number | null;
};

function decimalString(value: number) {
  return value.toFixed(2);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
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

function parseExecutions(value: unknown, errors: string[]) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    errors.push("executions must be an array.");
    return undefined;
  }

  const executions: ParsedExecutionInput[] = [];
  value.forEach((raw, index) => {
    const prefix = `executions[${index}]`;
    const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    if (input !== raw) {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    const action = parseRequiredString(input.action, `${prefix}.action`, errors)?.toUpperCase();
    const executedAt = parseDate(
      input.executedAt ?? input.executedAtTime,
      `${prefix}.executedAt`,
      errors,
    );
    const quantity = parsePositiveNumber(input.quantity, `${prefix}.quantity`, errors);
    const price = parsePositiveNumber(input.price, `${prefix}.price`, errors);
    const fees = parseNonNegativeNumber(input.fees, `${prefix}.fees`, errors);
    const id = parseOptionalString(input.id);

    if (quantity !== undefined && !Number.isInteger(quantity)) {
      errors.push(`${prefix}.quantity must be a whole number.`);
    }

    if (action && !executionActions.has(action)) {
      errors.push(`${prefix}.action must be BUY or SELL.`);
    }

    if (
      action &&
      executedAt &&
      quantity !== undefined &&
      Number.isInteger(quantity) &&
      price !== undefined &&
      fees !== undefined
    ) {
      executions.push({
        ...(id ? { id } : {}),
        action,
        executedAt,
        quantity,
        price: decimalString(price),
        fees: decimalString(fees),
      });
    }
  });

  return executions;
}

function sortedExecutions(executions: ExecutionLike[]) {
  return [...executions].sort((left, right) => {
    const timeDelta = left.executedAt.getTime() - right.executedAt.getTime();
    return timeDelta || (left.id ?? "").localeCompare(right.id ?? "");
  });
}

function openingActionForSide(side: string) {
  return side === "SHORT" ? "SELL" : "BUY";
}

function reducingActionForSide(side: string) {
  return side === "SHORT" ? "BUY" : "SELL";
}

export function deriveExecutionSnapshot(side: string, executions: ExecutionLike[]): ExecutionSnapshot {
  const errors: string[] = [];
  const openingAction = openingActionForSide(side);
  const reducingAction = reducingActionForSide(side);
  let remainingQuantity = 0;
  let averageEntryPrice = 0;
  let totalQuantity = 0;
  let closedQuantity = 0;
  let realizedPnl = 0;
  let exitDate: Date | null = null;
  let exitPrice: number | null = null;

  if (executions.length === 0) {
    errors.push("executions must include at least one opening execution.");
  }

  for (const execution of sortedExecutions(executions)) {
    const quantity = execution.quantity;
    const price = numberFromDecimal(execution.price);
    const fees = numberFromDecimal(execution.fees);

    if (!executionActions.has(execution.action)) {
      errors.push("execution action must be BUY or SELL.");
      continue;
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      errors.push("execution quantity must be a positive whole number.");
      continue;
    }

    if (!Number.isFinite(price) || price <= 0) {
      errors.push("execution price must be greater than zero.");
      continue;
    }

    if (!Number.isFinite(fees) || fees < 0) {
      errors.push("execution fees must be zero or greater.");
      continue;
    }

    if (execution.action === openingAction) {
      const newQuantity = remainingQuantity + quantity;
      averageEntryPrice =
        newQuantity === 0
          ? 0
          : (averageEntryPrice * remainingQuantity + price * quantity) / newQuantity;
      remainingQuantity = newQuantity;
      totalQuantity += quantity;
      continue;
    }

    if (execution.action === reducingAction) {
      if (quantity > remainingQuantity) {
        errors.push("reducing executions cannot exceed the currently open quantity.");
        continue;
      }

      const priceDelta =
        side === "SHORT" ? averageEntryPrice - price : price - averageEntryPrice;
      realizedPnl += priceDelta * quantity - fees;
      remainingQuantity -= quantity;
      closedQuantity += quantity;
      exitDate = execution.executedAt;
      exitPrice = price;
    }
  }

  if (totalQuantity === 0 && executions.length > 0) {
    errors.push("executions must include at least one opening execution.");
  }

  return {
    errors,
    totalQuantity,
    closedQuantity,
    remainingQuantity,
    averageEntryPrice: totalQuantity === 0 ? null : roundMoney(averageEntryPrice),
    realizedPnl: closedQuantity === 0 ? null : roundMoney(realizedPnl),
    status: remainingQuantity === 0 && totalQuantity > 0 ? "CLOSED" : "OPEN",
    exitDate,
    exitPrice,
  };
}

export function legacyExecutionsFromTrade(input: {
  side: string;
  tradeDate: Date;
  quantity: number;
  entryPrice: string | Prisma.Decimal;
  exitDate?: Date | null;
  exitPrice?: string | Prisma.Decimal | null;
  fees?: string | Prisma.Decimal;
  status: string;
}) {
  const executions: ParsedExecutionInput[] = [
    {
      action: openingActionForSide(input.side),
      executedAt: input.tradeDate,
      quantity: input.quantity,
      price: decimalString(numberFromDecimal(input.entryPrice)),
      fees: "0.00",
    },
  ];

  if (input.status === "CLOSED" && input.exitDate && input.exitPrice !== null && input.exitPrice !== undefined) {
    executions.push({
      action: reducingActionForSide(input.side),
      executedAt: input.exitDate,
      quantity: input.quantity,
      price: decimalString(numberFromDecimal(input.exitPrice)),
      fees: decimalString(numberFromDecimal(input.fees)),
    });
  }

  return executions;
}

export function tradeSnapshotData(snapshot: ExecutionSnapshot) {
  return {
    quantity: snapshot.totalQuantity,
    entryPrice:
      snapshot.averageEntryPrice === null ? undefined : decimalString(snapshot.averageEntryPrice),
    exitDate: snapshot.exitDate,
    exitPrice: snapshot.exitPrice === null ? null : decimalString(snapshot.exitPrice),
    status: snapshot.status,
    grossPnl: snapshot.realizedPnl === null ? null : decimalString(snapshot.realizedPnl),
  };
}

export function derivedTradeWriteData(
  side: string,
  executions: ExecutionLike[],
  fallback: {
    tradeDate: Date;
    entryPrice: string | Prisma.Decimal;
    fees: string | Prisma.Decimal;
  },
) {
  const snapshot = deriveExecutionSnapshot(side, executions);
  if (snapshot.errors.length > 0) {
    return { ok: false as const, errors: snapshot.errors };
  }

  const snapshotData = tradeSnapshotData(snapshot);
  const orderedExecutions = sortedExecutions(executions);
  const executionFees = executions.reduce(
    (sum, execution) => sum + numberFromDecimal(execution.fees),
    0,
  );

  return {
    ok: true as const,
    data: {
      tradeDate: orderedExecutions[0]?.executedAt ?? fallback.tradeDate,
      quantity: snapshotData.quantity,
      entryPrice: snapshotData.entryPrice ?? fallback.entryPrice,
      exitDate: snapshotData.exitDate,
      exitPrice: snapshotData.exitPrice,
      fees: executionFees > 0 ? executionFees.toFixed(2) : fallback.fees,
      status: snapshotData.status,
      grossPnl: snapshotData.grossPnl,
    },
  };
}

export function returnPercentForTrade(input: {
  status: string;
  grossPnl: unknown;
  entryPrice: unknown;
  quantity: number;
}) {
  if (input.grossPnl === null || input.grossPnl === undefined) {
    return null;
  }

  const basis = numberFromDecimal(input.entryPrice) * input.quantity;
  if (basis <= 0) {
    return null;
  }

  return Number(((numberFromDecimal(input.grossPnl) / basis) * 100).toFixed(2));
}

export function serializeTrade(trade: Trade | TradeWithExecutions) {
  const executions = "executions" in trade ? trade.executions : [];
  const snapshot =
    executions.length > 0 ? deriveExecutionSnapshot(trade.side, executions) : null;
  const realizedPnl =
    snapshot?.realizedPnl ??
    (trade.grossPnl === null || trade.grossPnl === undefined
      ? null
      : numberFromDecimal(trade.grossPnl));
  const quantity = snapshot?.totalQuantity ?? trade.quantity;
  const remainingQuantity =
    snapshot?.remainingQuantity ?? (trade.status === "CLOSED" ? 0 : trade.quantity);
  const entryPrice = snapshot?.averageEntryPrice ?? numberFromDecimal(trade.entryPrice);
  const exitDate = snapshot?.exitDate ?? trade.exitDate;
  const exitPrice = snapshot?.exitPrice ?? (trade.exitPrice === null ? null : numberFromDecimal(trade.exitPrice));
  const status = snapshot?.status ?? trade.status;
  const closedQuantity =
    snapshot?.closedQuantity ?? (status === "CLOSED" && realizedPnl !== null ? quantity : 0);

  return {
    id: trade.id,
    assetClass: trade.assetClass,
    symbol: trade.symbol,
    side: trade.side,
    quantity,
    remainingQuantity,
    entryDateTime: trade.tradeDate.toISOString(),
    entryPrice,
    exitDateTime: exitDate?.toISOString() ?? null,
    exitPrice,
    fees: numberFromDecimal(trade.fees),
    status,
    grossPnl: realizedPnl,
    returnAmount: realizedPnl,
    returnPercent:
      realizedPnl === null
        ? null
        : returnPercentForTrade({
            status,
            grossPnl: realizedPnl,
            entryPrice,
            quantity: closedQuantity > 0 ? closedQuantity : quantity,
          }),
    executions: executions.map((execution) => ({
      id: execution.id,
      action: execution.action,
      executedAt: execution.executedAt.toISOString(),
      quantity: execution.quantity,
      price: numberFromDecimal(execution.price),
      fees: numberFromDecimal(execution.fees),
    })),
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

  const executions = parseExecutions(input.executions, errors);
  if (executions !== undefined) {
    parsed.executions = executions;
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
