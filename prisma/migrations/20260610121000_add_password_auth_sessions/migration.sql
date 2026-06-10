-- AlterTable
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT NOT NULL DEFAULT 'scrypt$16384$8$1$I05xhkupRS_FpZ82PcEydA$lIoFnF8Dg3Nkq-esAWk8iSohThitNkC9v4KfSMDhdIEOGQcslYtDnwbgppy1Dkl9ShVYr5wpmq1Stdqv8kWFbw';

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_idx" ON "auth_sessions"("expires_at");
