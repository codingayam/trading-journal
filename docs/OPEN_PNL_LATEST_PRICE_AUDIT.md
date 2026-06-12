# Open P&L Latest Price Audit

## Summary

Open P&L is not calculated today. Open trades are represented with `grossPnl`,
`returnAmount`, and `returnPercent` as `null`; user-facing tables display
`Open` instead of a dollar P&L value. Dashboard, stats, and calendar totals are
realized-only and exclude open positions from P&L aggregation.

There is no latest/current price source in the current implementation. The data
model stores entry and exit prices, but has no quote table, mark price field,
market data cache, external market data client, or placeholder current-price
calculation.

## Current Behavior

### Trade storage and serialization

- `prisma/schema.prisma:64-71` stores `entryPrice`, optional `exitDate`,
  optional `exitPrice`, `status`, and optional `grossPnl`. There is no
  `currentPrice`, `markPrice`, `quote`, or market data model.
- `lib/trades.ts:97-121` calculates `grossPnl` only when the trade is not open
  and both exit date and exit price exist. Open trades return `null`.
- `lib/trades.ts:123-139` returns `null` for return percent when `status` is
  `OPEN` or `grossPnl` is missing.
- `lib/trades.ts:141-164` serializes open trades with `grossPnl`,
  `returnAmount`, and `returnPercent` as `null`.

### Dashboard

- `app/page.tsx:29-39` passes serialized trades into the dashboard workspace.
- `lib/dashboard.ts:100-117` calculates summary totals from trades where
  `returnAmount !== null`; open trades are counted separately through
  `openTrades`.
- `lib/dashboard.ts:120-142` builds the equity curve only from trades where
  `returnAmount !== null`.
- `app/dashboard-view.tsx:109-117` displays total P&L from the realized-only
  summary and displays open trades as a count.
- `app/dashboard-view.tsx:181-187` renders open rows as `Open` for exit, P&L,
  and P&L percent.

Result: the dashboard excludes open P&L from total P&L, win/loss metrics, and
the equity curve. Open trades remain visible in the recent performance table as
open rows.

### Stats

- `lib/stats.ts:85-102` creates realized stats only from trades where
  `status === "CLOSED"` and `grossPnl` is finite.
- `lib/stats.ts:135-157` reports `openTrades` as the non-realized remainder,
  while all P&L metrics use the realized trade set.
- `app/stats/page.tsx:124-132` labels profit factor with
  `open trades excluded`.

Result: stats exclude open P&L entirely, while exposing open trade count as
context.

### Calendar

- `lib/pnl-calendar.ts:36-43` rejects any trade that is not `CLOSED`, has no
  `returnAmount`, or has no `exitDateTime`.
- `lib/pnl-calendar.ts:58-95` builds monthly and daily totals only from those
  closed trades.
- `app/pnl-calendar.tsx:167-185` labels the calendar total as `Realized P/L`
  and states that P&L appears once trades are closed.

Result: calendar P&L is realized-only and excludes open positions.

### Trade log and API

- `app/trade-log.tsx:114-117` counts open trades by `returnAmount === null`.
- `app/trade-log.tsx:252-265` renders open exit and return cells as `Open`.
- `app/api/trades/route.ts:49-66` persists the parsed `grossPnl`; no latest
  price or market data lookup occurs.
- `app/api/trades/[id]/route.ts:56-85` updates a trade from submitted fields
  and serializes the persisted row; no quote fetch or mark lookup occurs.

Result: the trade log displays no open P&L amount. Open positions show `Open`.

## Price Source Audit

Current implementation has none of the following:

- external market data fetch for latest quotes;
- cached quote or price table;
- manual mark price field;
- latest price placeholder or fallback to entry price;
- unrealized/open P&L helper.

The only network `fetch` calls found are app-local API calls from client
components. The only persisted price fields are trade entry and exit prices.

## Existing Regression Coverage

Current tests already prove the realized-only behavior:

- `tests/dashboard.test.ts:11-24` includes an open NVDA trade with
  `returnAmount: null`; `tests/dashboard.test.ts:79-99` proves dashboard total
  P&L and the equity curve use only the four closed trades.
- `tests/stats.test.ts:83-93` creates an open trade; `tests/stats.test.ts:112-124`
  proves stats count it as open while closed stats use only three realized
  trades.
- `tests/pnl-calendar.test.ts:50-59` includes an open trade;
  `tests/pnl-calendar.test.ts:62-87` proves monthly totals and trade counts use
  only closed trades.
- `tests/auth.test.ts:117-139` creates an open trade through the API and proves
  the serialized `returnAmount` is `null`; `tests/auth.test.ts:140-164` then
  closes that trade and proves realized P&L is calculated only after exit data
  exists.

## Display Guidance When No Latest Price Exists

Until an approved latest-price/mark-price feature exists, open P&L should not
be shown as a numeric value. The safest display is the current behavior:

- keep open position P&L as `Open`, `N/A`, or `null` in data payloads;
- keep dashboard, stats, and calendar totals labeled/treated as realized P&L;
- count open trades separately so users know excluded exposure exists;
- do not infer a latest price from entry price, stale exit price, or an
  untracked market source.

## Minimal Safe Design Before Implementation

If open P&L is implemented later, the minimal safe design should be explicit and
auditable:

1. Add a manual mark-price path first: persist `markPrice`, `markPriceAsOf`,
   and `markSource` on a mark/valuation model or equivalent per-user table.
2. Compute unrealized P&L only when an open trade has a finite approved mark:
   long positions use `(markPrice - entryPrice) * quantity - fees`; short
   positions use `(entryPrice - markPrice) * quantity - fees`.
3. Preserve realized metrics as the default dashboard/stats/calendar totals;
   show unrealized P&L in a separate, clearly labeled field.
4. Record stale/missing marks explicitly and display `Open` or `Unmarked`
   instead of a numeric value when no mark exists.
5. Add unit coverage for long/short open P&L, missing marks, stale marks,
   closed-trade exclusion from open P&L, and no cross-user mark leakage.
6. Do not add paid or unauthenticated market-data dependencies without explicit
   product approval and a provider-specific caching/rate-limit plan.
