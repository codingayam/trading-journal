import assert from "node:assert/strict";
import { buildSetupSummaries, calculateRiskReward } from "../lib/setups";

const setups = [
  {
    id: "setup-orb",
    name: "Opening range breakout",
    description: "Momentum continuation after the first range is cleared.",
    playbook: "Wait for range break, confirm volume, define invalidation.",
    isActive: true,
  },
  {
    id: "setup-pullback",
    name: "Pullback to support",
    description: "Trend-following entry after a controlled retracement.",
    playbook: "Prefer higher low structure and tight risk.",
    isActive: true,
  },
  {
    id: "setup-unused",
    name: "Unused setup",
    description: null,
    playbook: null,
    isActive: false,
  },
];

const summaries = buildSetupSummaries(setups, [
  { setupId: "setup-orb", status: "CLOSED", returnAmount: 95 },
  { setupId: "setup-orb", status: "CLOSED", returnAmount: -34 },
  { setupId: "setup-pullback", status: "CLOSED", returnAmount: 48 },
  { setupId: "setup-pullback", status: "CLOSED", returnAmount: -18 },
  { setupId: "setup-pullback", status: "OPEN", returnAmount: null },
  { setupId: null, status: "CLOSED", returnAmount: 500 },
]);

assert.deepEqual(
  summaries.map((setup) => ({
    id: setup.id,
    totalTrades: setup.totalTrades,
    closedTrades: setup.closedTrades,
    winRate: setup.winRate,
    averageWin: setup.averageWin,
    averageLoss: setup.averageLoss,
    riskReward: setup.riskReward,
  })),
  [
    {
      id: "setup-orb",
      totalTrades: 2,
      closedTrades: 2,
      winRate: 50,
      averageWin: 95,
      averageLoss: -34,
      riskReward: 2.79,
    },
    {
      id: "setup-pullback",
      totalTrades: 3,
      closedTrades: 2,
      winRate: 50,
      averageWin: 48,
      averageLoss: -18,
      riskReward: 2.67,
    },
    {
      id: "setup-unused",
      totalTrades: 0,
      closedTrades: 0,
      winRate: null,
      averageWin: null,
      averageLoss: null,
      riskReward: null,
    },
  ],
);

assert.equal(calculateRiskReward([100], []), null);
assert.equal(calculateRiskReward([], [-50]), null);
