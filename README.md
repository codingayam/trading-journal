# Trading Journal

Minimal full-stack foundation for a user-owned trading journal. The app uses
Next.js, Prisma, and SQLite for the MVP database, with base tables kept portable
for a later Postgres move.

## Setup

```sh
npm install
npm run db:migrate
npm run db:seed
```

The default local database URL is `file:./dev.db`, which creates
`prisma/dev.db`.

## Run

```sh
npm run dev
```

Open `http://localhost:3000` and log in with:

- Email: `demo@tradingjournal.local`
- Password: `password123`

## Test And Build

```sh
npm test
npm run build
```

## Database

```sh
npm run db:migrate
npm run db:seed
npm run db:reset
```

`db:seed` is idempotent and upserts one demo user, two setups, four closed
trades, and one open trade. `db:reset` removes the local SQLite file, reapplies
the migration, and reseeds the demo data.
