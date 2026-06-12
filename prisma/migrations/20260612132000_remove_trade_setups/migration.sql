-- Remove setup planning tables and trade relations from the MVP schema.
DROP INDEX IF EXISTS "trades_setup_idx";

CREATE TABLE "new_trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "asset_class" TEXT NOT NULL DEFAULT 'Stock',
    "trade_date" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "entry_price" DECIMAL NOT NULL,
    "exit_date" DATETIME,
    "exit_price" DECIMAL,
    "fees" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "gross_pnl" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_trades" (
    "id",
    "user_id",
    "asset_class",
    "trade_date",
    "symbol",
    "side",
    "quantity",
    "entry_price",
    "exit_date",
    "exit_price",
    "fees",
    "status",
    "gross_pnl",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "user_id",
    "asset_class",
    "trade_date",
    "symbol",
    "side",
    "quantity",
    "entry_price",
    "exit_date",
    "exit_price",
    "fees",
    "status",
    "gross_pnl",
    "created_at",
    "updated_at"
FROM "trades";

DROP TABLE "trades";
ALTER TABLE "new_trades" RENAME TO "trades";

DROP INDEX IF EXISTS "trade_setups_user_name_key";
DROP TABLE IF EXISTS "trade_setups";

CREATE INDEX "trades_user_date_idx" ON "trades"("user_id", "trade_date");
CREATE INDEX "trades_user_symbol_idx" ON "trades"("user_id", "symbol");
