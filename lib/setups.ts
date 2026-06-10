export type SetupDefinition = {
  id: string;
  name: string;
  description: string | null;
  playbook: string | null;
  isActive: boolean;
};

export type SetupSummaryTrade = {
  setupId: string | null;
  status: string;
  returnAmount: number | null;
};

export type SetupSummary = {
  id: string;
  name: string;
  description: string | null;
  playbook: string | null;
  isActive: boolean;
  totalTrades: number;
  closedTrades: number;
  winRate: number | null;
  averageWin: number | null;
  averageLoss: number | null;
  riskReward: number | null;
};

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

export function calculateRiskReward(wins: number[], losses: number[]) {
  if (wins.length === 0 || losses.length === 0) {
    return null;
  }

  const averageWin = wins.reduce((sum, value) => sum + value, 0) / wins.length;
  const averageLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0) / losses.length);

  return averageLoss === 0 ? null : roundMetric(averageWin / averageLoss);
}

export function buildSetupSummaries(
  setups: SetupDefinition[],
  trades: SetupSummaryTrade[],
): SetupSummary[] {
  return setups.map((setup) => {
    const setupTrades = trades.filter((trade) => trade.setupId === setup.id);
    const closed = setupTrades.filter(
      (trade) => trade.status === "CLOSED" && trade.returnAmount !== null,
    );
    const wins = closed
      .map((trade) => trade.returnAmount ?? 0)
      .filter((returnAmount) => returnAmount > 0);
    const losses = closed
      .map((trade) => trade.returnAmount ?? 0)
      .filter((returnAmount) => returnAmount < 0);

    return {
      id: setup.id,
      name: setup.name,
      description: setup.description,
      playbook: setup.playbook,
      isActive: setup.isActive,
      totalTrades: setupTrades.length,
      closedTrades: closed.length,
      winRate: closed.length === 0 ? null : roundMetric((wins.length / closed.length) * 100),
      averageWin:
        wins.length === 0
          ? null
          : roundMetric(wins.reduce((sum, value) => sum + value, 0) / wins.length),
      averageLoss:
        losses.length === 0
          ? null
          : roundMetric(losses.reduce((sum, value) => sum + value, 0) / losses.length),
      riskReward: calculateRiskReward(wins, losses),
    };
  });
}
