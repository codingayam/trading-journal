-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "trade_setups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "playbook" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trade_setups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "setup_id" TEXT,
    "trade_date" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "entry_price" DECIMAL NOT NULL,
    "exit_price" DECIMAL,
    "gross_pnl" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trades_setup_id_fkey" FOREIGN KEY ("setup_id") REFERENCES "trade_setups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trade_setups_user_name_key" ON "trade_setups"("user_id", "name");

-- CreateIndex
CREATE INDEX "trades_user_date_idx" ON "trades"("user_id", "trade_date");

-- CreateIndex
CREATE INDEX "trades_user_symbol_idx" ON "trades"("user_id", "symbol");

-- CreateIndex
CREATE INDEX "trades_setup_idx" ON "trades"("setup_id");
