# Ticker-Level P&L Audit

## Current Behavior

- The dashboard exposes overall realized P&L only. `getDashboardSummary` sums
  closed trade `returnAmount` values into `totalPnl`, win/loss counts, averages,
  and open/closed counts, but it does not group by `symbol`
  (`lib/dashboard.ts:100`). `DashboardView` renders those totals plus a dense
  trade table and closed-trade equity curve; symbols appear per row or equity
  point, not as aggregate ticker buckets (`app/dashboard-view.tsx:109`,
  `app/dashboard-view.tsx:156`, `app/dashboard-view.tsx:197`).
- The stats page exposes realized P&L metrics plus breakdowns by day of week and
  hour only. `calculateTradeStats` currently returns `byDayOfWeek` and `byHour`,
  plus best/worst single trade labels, but no `bySymbol` or ticker-level totals
  (`lib/stats.ts:119`, `lib/stats.ts:127`, `lib/stats.ts:135`). The UI renders
  only those two breakdown tables (`app/stats/page.tsx:183`).
- The P&L calendar groups realized P&L by exit date, not ticker. It keeps each
  trade's symbol in daily detail rows, but month/day totals are date buckets
  (`lib/pnl-calendar.ts:58`, `lib/pnl-calendar.ts:83`).

## Data Model Support

- The data model has the basic fields needed for simple symbol-level realized
  aggregation: each trade stores `userId`, `symbol`, `status`, `grossPnl`,
  dates, side, quantity, and prices (`prisma/schema.prisma:57`). There is also a
  user/symbol index for efficient per-user symbol reads
  (`prisma/schema.prisma:78`).
- Trade input normalizes symbols to uppercase before persistence
  (`lib/trades.ts:199`), which is enough for basic ticker grouping within the
  current single-broker/manual-entry model.
- Reliability limitations remain: `symbol` is a free-text string rather than a
  security master relation, so the model cannot distinguish share classes,
  exchanges, aliases, expired option contracts, or broker-specific instrument
  variants without additional normalization fields.

## Realized vs Open P&L

- Realized and open P&L are separated in the current app. `serializeTrade`
  returns `returnAmount: null` for open trades or trades without a complete exit,
  even if the row has an entry (`lib/trades.ts:141`).
- Dashboard summary and equity curve calculations filter out null
  `returnAmount`, so open trades affect `openTrades` but not total P&L or equity
  curve (`lib/dashboard.ts:100`, `lib/dashboard.ts:120`).
- Stats calculations additionally require `status === "CLOSED"` and finite
  `grossPnl`; non-realized rows are excluded from realized metrics and counted
  as open/non-realized (`lib/stats.ts:85`, `lib/stats.ts:135`).

## Minimal Missing Scope

Ticker-level P&L is missing from both dashboard and stats UI. The minimal
implementation should be:

1. Add a pure aggregation helper, likely in `lib/stats.ts`, that returns a
   `bySymbol` array from realized trades with `symbol`, trade count, total P&L,
   average P&L, win rate, and profit factor.
2. Keep open trades separate by either excluding them from realized `bySymbol`
   totals and exposing an `openTrades` count per symbol, or by adding a separate
   `openBySymbol` structure. Do not mix unrealized rows into realized P&L until
   the app has mark-to-market pricing.
3. Render a compact `By Symbol` breakdown table on `/stats`, sorted by total P&L
   or trade count, reusing the existing `BreakdownTable` shape if the columns
   stay compatible.
4. Add unit coverage in `tests/stats.test.ts` for multiple trades in the same
   symbol, mixed winners/losers, another user's same symbol, and an open trade
   that must not contribute to realized symbol P&L.
5. Add browser coverage only if the UI table is implemented in the same change.

