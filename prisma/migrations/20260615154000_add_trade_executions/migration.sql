-- CreateTable
CREATE TABLE "trade_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trade_id" TEXT NOT NULL,
    "executed_at" DATETIME NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "fees" DECIMAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trade_executions_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "trade_executions_trade_time_idx" ON "trade_executions"("trade_id", "executed_at");

-- Backfill existing position rows into opening executions.
INSERT INTO "trade_executions" (
    "id",
    "trade_id",
    "executed_at",
    "action",
    "quantity",
    "price",
    "fees",
    "created_at",
    "updated_at"
)
SELECT
    "id" || '-open',
    "id",
    "trade_date",
    CASE WHEN "side" = 'SHORT' THEN 'SELL' ELSE 'BUY' END,
    "quantity",
    "entry_price",
    0,
    "created_at",
    "updated_at"
FROM "trades";

-- Backfill closed position rows into reducing executions.
INSERT INTO "trade_executions" (
    "id",
    "trade_id",
    "executed_at",
    "action",
    "quantity",
    "price",
    "fees",
    "created_at",
    "updated_at"
)
SELECT
    "id" || '-close',
    "id",
    COALESCE("exit_date", "trade_date"),
    CASE WHEN "side" = 'SHORT' THEN 'BUY' ELSE 'SELL' END,
    "quantity",
    "exit_price",
    "fees",
    "created_at",
    "updated_at"
FROM "trades"
WHERE "status" = 'CLOSED'
  AND "exit_price" IS NOT NULL;
