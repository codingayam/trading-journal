const { existsSync, readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

process.env.DATABASE_URL ??= "file:./dev.db";

const { PrismaClient } = require("@prisma/client");

const migrationsDir = path.resolve("prisma/migrations");
const prisma = new PrismaClient();

function statementsFrom(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const migrationNames = readdirSync(migrationsDir)
    .filter((name) => existsSync(path.join(migrationsDir, name, "migration.sql")))
    .sort();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_app_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const name of migrationNames) {
    const applied = await prisma.$queryRawUnsafe(
      'SELECT 1 FROM "_app_migrations" WHERE "name" = ? LIMIT 1',
      name,
    );

    if (applied.length > 0) {
      console.log(`Already applied ${name}`);
      continue;
    }

    const sql = readFileSync(
      path.join(migrationsDir, name, "migration.sql"),
      "utf8",
    );

    await prisma.$transaction(async (tx) => {
      for (const statement of statementsFrom(sql)) {
        await tx.$executeRawUnsafe(statement);
      }
      await tx.$executeRawUnsafe(
        'INSERT INTO "_app_migrations" ("name") VALUES (?)',
        name,
      );
    });

    console.log(`Applied ${name}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
