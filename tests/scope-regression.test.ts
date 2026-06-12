import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const sidebar = read("app/app-sidebar.tsx");
assert.ok(!sidebar.includes("Setups"), "sidebar must not expose setup navigation");
assert.ok(!sidebar.includes("#setups"), "sidebar must not link to setup anchors");

const workspace = read("app/trading-workspace.tsx");
assert.ok(!workspace.includes("SetupSummary"), "dashboard workspace must not render setup cards");

const home = read("app/page.tsx");
assert.ok(!home.includes("buildSetupSummaries"), "home page must not derive setup summaries");
assert.ok(!home.includes("user.setups"), "home page must not load setup data");

const schema = read("prisma/schema.prisma");
assert.ok(!schema.includes("TradeSetup"), "schema must not include TradeSetup model");
assert.ok(!schema.includes("setupId"), "schema must not include trade setup relation fields");
assert.ok(!schema.includes("trade_setups"), "schema must not include setup table mapping");

const seed = read("prisma/seed.ts");
assert.ok(!seed.includes("tradeSetup"), "seed data must not create setup records");
assert.ok(!seed.includes("setupId"), "seed data must not attach trades to setups");

const scripts = read("package.json");
assert.ok(!scripts.includes("test:setups"), "test script must not keep setup test target");
