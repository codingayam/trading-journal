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

Open `http://localhost:3000` to view the seeded demo user's placeholder shell.

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

`db:seed` is idempotent and upserts one demo user, trading sessions, setups,
trades, and day notes. `db:reset` removes the local SQLite file, reapplies the
migration, and reseeds the demo data.
