# MVP QA Checklist

Use this checklist from a clean setup.

## Clean Setup

- [ ] Run `npm install`.
- [ ] Run `npm run db:reset`.
- [ ] Run `npm run dev`.
- [ ] Open `http://localhost:3000`.

## Manual QA

- [ ] Login: sign in with `demo@tradingjournal.local` / `password123` and land on the dashboard.
- [ ] Signup: create a new account with a unique email and confirm the empty dashboard loads.
- [ ] Logout: click `Log out` and confirm protected pages redirect to `/login`.
- [ ] Dashboard: log back in as the demo user and confirm total P/L is `$91.00`, win rate is `50%`, two wins, two losses, and one open trade.
- [ ] Trade creation: create a new open trade and confirm it appears in the Trade Log.
- [ ] Trade editing: edit the new trade to `CLOSED` with an exit price and confirm return amount/percent update.
- [ ] Stats: open `/stats` and confirm closed trade stats exclude the open trade.
- [ ] Calendar: confirm June 2026 totals show `$91.00` across four closed trades.

## Scope Regression

- [ ] Confirm no trade journal note field, screenshot field, confidence field, or journal-entry flow is visible.
- [ ] Confirm there is no trade detail review page/modal and no candlestick review chart.
- [ ] Confirm there are no accounts, balances, cash/active balance, deposits, withdrawals, transactions, or CSV export surfaces.
- [ ] Confirm there are no profile/settings/default preferences/security/data-management tools.
- [ ] Confirm there is no tag manager and no tag-based analytics.
- [ ] Confirm there are no setup navigation, setup summary cards, setup planning forms, or setup risk/reward surfaces.

## Automation

- [ ] Run `npm test`.
- [ ] Optional source check: `rg -n "notes|screenshot|confidence|review chart|balance|deposit|withdraw|transaction|CSV export|settings|tag manager" app lib prisma tests`.
