# MVP Scope and Stonk UI Reference

This document defines the MVP implementation boundary for the trading journal app.
Use the Stonk Journal surfaces below as UI references only. Do not copy protected
assets, logos, screenshots, proprietary copy, or unsupported marketing claims.

## In Scope

- Auth: login and signup pages with email/password forms, Google auth button
  placement, and a split layout that pairs the form with a product preview/value
  panel.
- Dashboard: authenticated app shell with compact date filters, KPI cards, PnL
  summary, and an at-a-glance trade table.
- Trades: a dedicated MVP trade-list surface using the dense dashboard table
  style. The source app shows the trade list inside the dashboard; do not assume
  a Stonk `/trades` route exists.
- Setups: a lightweight MVP setup-management page because setups are part of
  the accepted product scope. The source site references setups as a feature,
  but the observed source app did not expose a dedicated `/setups` route.
- Stats: summary metric cards plus dense breakdown tables for tags, symbols, or
  comparable aggregate slices.
- Calendar: calendar grid with a compact weekly summary area.

## Explicitly Out Of Scope

- No trade journal notes, screenshots, confidence fields, or journal-entry
  narrative modules.
- No trade review or trade-detail review screen.
- No accounts module, broker/account rollups, account profile, or account
  management flows.
- No settings, profile/settings, password/security, danger/data tools, or tag
  manager.
- No marketing site, pricing page, blog, public share pages, AI coach, CSV
  import, broker sync, or subscription/paywall flows.

For validation clarity: this MVP must include no trade journal, no trade review,
no accounts, and no settings.

## UI Reference Notes

Reference pages checked on 2026-06-10:

- `https://stonkjournal.com/`
- `https://app.stonkjournal.com/login`
- `https://app.stonkjournal.com/signup`
- Authenticated app shell after login for dashboard/stats/calendar and excluded
  account/settings boundaries.

### Public Landing Page

- Overall tone is dark, dense, and product-forward rather than airy marketing.
- Header uses a compact nav, strong primary calls to action, and a dark
  charcoal shell.
- Hero is split: left side copy/actions, right side a trading table preview.
- Trade previews use dense rows and narrow columns with uppercase labels such as
  symbol, entry, PnL, and status.
- Positive PnL is green and negative PnL is red.
- Cards, panels, and buttons use small-to-medium rounded corners.
- The landing page includes broad marketing modules, pricing, FAQ, and public
  claims; those are not MVP requirements.

### Login

- Split auth layout: form column on the left, product screenshot/value panel on
  the right.
- Form stack is compact: logo/link, headline, subhead, Google button, divider,
  email/password inputs, primary login button, and signup link.
- Inputs and buttons are rounded, full-width, and visually quiet.
- The right panel reinforces the product with a short value statement and app
  screenshot reference. For this product, recreate the layout pattern without
  copying the screenshot or Stonk branding.

### Signup

- Same split auth layout as login.
- Left form includes name, email, password, Google signup button, and a login
  link for existing users.
- Keep the form compact and vertically aligned with consistent input/button
  sizing.

### Authenticated App Shell

- Main app uses a narrow dark icon rail on the left and a wide content canvas.
- Dashboard top area uses compact date-range chips and small KPI cards.
- KPI cards are information-dense, with uppercase labels and short numeric
  values.
- Dashboard/trade table is dense, with compact columns for date, symbol, status,
  side, quantity, entry, exit, totals, hold, return, and return percent.
- Stats page uses compact metric cards followed by dense tables.
- Calendar page uses the same app shell with a large calendar area and compact
  weekly summary.
- Account/profile/settings/tag/security/data-tool screens exist in the source
  app but are excluded from this MVP.

## Visual Tokens

- Shell: dark charcoal navigation/sidebar with a light content canvas.
- Primary accent: blue for primary buttons, selected states, and active links.
- PnL colors: green for gains/positive values, red for losses/negative values.
- Shape: rounded cards, rounded inputs, rounded buttons, and compact chips.
- Density: compact KPI cards, tight table row heights, uppercase labels, and
  dense numeric layouts.
- Auth: split layout with form column plus product/value panel.

## Implementation Note

This product must avoid unsupported Stonk branding claims, including claims like
`100,000+ traders`. Do not imply official affiliation with Stonk Journal, do not
reuse Stonk-owned assets, and do not copy marketing copy unless it is replaced
with product-owned, supportable language.
