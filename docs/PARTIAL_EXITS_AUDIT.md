# Partial Exits Audit

## Current behavior

Trade logging does not currently support selling less than 100% of an open
position as a position lifecycle. The app stores each trade as one row with one
entry quantity, one optional exit date, one optional exit price, one status, and
one realized P&L value.

Relevant code:

- `prisma/schema.prisma:57`: `Trade` has `quantity`, `exitDate`, `exitPrice`,
  `status`, and `grossPnl`; there is no execution table, exit quantity, or
  position identifier for grouping entries and exits.
- `lib/trades.ts:97`: `parseTradeInput` accepts one `quantity` and one exit
  price. When the trade is closed, `calculateGrossPnl` uses the full entry
  quantity: `(exitPrice - entryPrice) * quantity - fees` for long trades,
  inverted for shorts.
- `app/api/trades/route.ts:21`: `POST /api/trades` creates one complete trade
  row.
- `app/api/trades/[id]/route.ts:20`: `PATCH /api/trades/:id` only updates
  fields on that one row. Unsupported fields such as `exitQuantity` are not
  accepted as update fields.
- `app/trade-log.tsx:21`: the manual trade form exposes one side, one quantity,
  one status, one exit date/time, and one exit price. It has no "record partial
  sell" or "add exit" action.
- `lib/dashboard.ts:100`, `lib/stats.ts:85`, and `lib/pnl-calendar.ts:36`:
  realized metrics treat one serialized trade row as either open or closed based
  on the row's realized P&L and status.

## Questions answered

### Does the current trade model support multiple executions or partial exits?

No. A trade is modeled as a single entry with at most one exit. There is no child
execution model and no persisted exit quantity.

### Can a user log one buy and several sells against the same position?

No. A user can create multiple rows manually, but those rows are independent
trades. A later sell row cannot be linked to the original buy row, cannot reduce
the original open quantity, and cannot share average cost or realized P&L with
that original position.

### How are remaining quantity, average cost, realized P&L, and open P&L represented?

- Remaining quantity: not represented. Open count is row-based, not
  quantity-based.
- Average cost: represented only as the row's `entryPrice`; there is no
  multi-fill average cost.
- Realized P&L: represented by `grossPnl` on the trade row, calculated against
  the full `quantity` once the row is closed.
- Open P&L: not represented. The app does not store or fetch mark prices, so an
  open trade has `grossPnl: null`, `returnAmount: null`, and `returnPercent:
  null`.

### What breaks if a user exits only part of a position today?

If the user edits the original trade to `CLOSED`, the app realizes P&L for the
full original quantity even when only part of the position was sold. If the user
creates a separate sell row, that row is treated as a new short trade rather
than an exit against the long position. Dashboard totals, stats, calendar P&L,
open-trade counts, and equity curve output will therefore be wrong for the
position lifecycle.

## Minimal support proposal

Add explicit exit executions while keeping the manual trade-entry model simple.

### Model

Keep `Trade` as the position entry row and add a child `TradeExit` table:

- `id`
- `tradeId`
- `exitDate`
- `quantity`
- `exitPrice`
- `fees`
- `grossPnl`
- timestamps

Derive:

- `realizedQuantity = sum(trade.exits.quantity)`
- `remainingQuantity = trade.quantity - realizedQuantity`
- `averageCost = trade.entryPrice` for the current MVP because only one entry
  fill exists
- `realizedPnl = sum(trade.exits.grossPnl)`
- `status = CLOSED` when `remainingQuantity === 0`, otherwise `OPEN`
- `openPnl = null` until market prices exist

This supports one buy with several sells while avoiding a full multi-entry
position engine.

### API

Add a focused exit endpoint:

- `POST /api/trades/:id/exits` to record a partial or full exit.
- Validate that the trade belongs to the current user.
- Validate `quantity` is a whole number greater than zero.
- Validate `quantity <= remainingQuantity`.
- Calculate exit P&L from the parent trade's side, entry price, exit price,
  exit quantity, and exit fees.
- Return the serialized parent trade with derived `realizedQuantity`,
  `remainingQuantity`, `realizedPnl`, and current status.

Keep the existing `POST /api/trades` flow for opening a position and the current
single-row full-close fields as backwards-compatible legacy fields until seed
data and existing rows are migrated.

### UI

Keep the current New Trade form for entries. Add one action on open rows:

- `Record Exit`
- fields: exit date/time, quantity sold/covered, exit price, fees
- helper values: remaining quantity before save and estimated realized P&L

In tables, show:

- `Qty`: original quantity
- `Open Qty`: remaining quantity
- `Realized`: realized P&L from exits
- `Status`: open until the remaining quantity reaches zero

This keeps the workflow manual-trader friendly: users open a position once,
then record each real-world sell/cover as it happens.

## Test coverage to add with implementation

When implemented, add tests for:

- A long trade with quantity 100 and one exit of 25 shares at a higher price
  leaves `remainingQuantity = 75` and realizes P&L only on 25 shares.
- A second exit against the same trade accumulates realized P&L and reduces
  remaining quantity again.
- An exit cannot exceed remaining quantity.
- A final exit changes the derived status to `CLOSED`.
- Dashboard, stats, and calendar use realized exit P&L while keeping partially
  exited positions counted as open.
