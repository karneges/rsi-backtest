export interface TradeConfig {
  version: number;
  symbol: string;
  timeframe: string;
  longEntryRsi: number;
  longExitRsi: number;
  shortEntryRsi: number;
  shortExitRsi: number;
  leverage: number;
  fixedPositionSize: number;
  addPositionSize: number;
  breakEvenThreshold: number;
  minProfitPercent: number;
  maxLossEntries: number;
  positionAddDelay: number;
  limit: number;
  cacheTTL: number;
  closeStrategy: "rsi" | "profit";
  rsiPeriod: number;
  atrPeriod: number;
  avgAtrPeriod: number;
  atrTradeMultiplier: number;
  customLongPositionLogic: string;
  customShortPositionLogic: string;
}
