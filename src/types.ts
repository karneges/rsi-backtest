export interface TradeConfig {
  leverage: number;
  longEntryRsi: number;
  longExitRsi: number;
  shortEntryRsi: number;
  shortExitRsi: number;
  breakEvenThreshold: number;
  minProfitPercent: number; // Minimum profit percentage required to close a position
  fixedPositionSize: number; // Fixed position size in USDT for initial trade
  addPositionSize: number; // Fixed position size in USDT for adding to positions
  maxLossEntries: number; // Maximum number of entries to add to a losing position (0 = unlimited)
  positionAddDelay: number; // Minimum delay in milliseconds between adding to positions
  symbol: string;
  timeframe: string;
  limit: number; // Number of candlesticks to fetch
  cacheTTL: number; // Time to live for candlesticks cache in minutes (0 = no cache)
  closeStrategy: "rsi" | "profit" | "hybrid";
  switchCloseStrategyNotional: number; // Notional value at which to switch between strategies
  atrTradeMultiplier: number;
  rsiPeriod: number; // Period for RSI calculation
  atrPeriod: number; // Period for ATR calculation
  avgAtrPeriod: number; // Period for Average ATR calculation
}

export type TradeType = "LONG" | "SHORT";

export type TradeStatus = "OPEN" | "CLOSED" | "NOT_COMPLETED";

export interface TradePosition {
  type: TradeType;
  entries: {
    price: number;
    size: number;
    timestamp: number;
    entryRsi: number;
    pnl: number;
    entryAtr: number;
    avgAtr: number;
    breakevenPrice: number;
    entryCandleTimestamp: number;
  }[];
  averageEntryPrice: number;
  currentSize: number;
  openTimestamp: number;
  lastEntryTimestamp: number; // Timestamp of the last entry to track delays
  openRsi: number; // RSI value at the initial position open
  closeTimestamp?: number;
  closePrice?: number;
  closeRsi?: number; // RSI value at position close
  profit?: number;
  profitPercent?: number;
  status: TradeStatus; // New field to track trade status
}

export interface HistoricalData {
  timestamp: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

export interface HistoricalTrade {
  tradeId: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  timestamp: number;
}

export interface CandleWithTrades extends HistoricalData {
  trades: HistoricalTrade[];
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  profitLossRatio: number;
  totalProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  averageTradeLength: number; // in hours
  longTradeStats: {
    totalTrades: number;
    winningTrades: number;
    winRate: number;
    totalProfit: number;
  };
  shortTradeStats: {
    totalTrades: number;
    winningTrades: number;
    winRate: number;
    totalProfit: number;
  };
}

export interface BacktestResult {
  config: TradeConfig;
  trades: TradePosition[];
  stats: TradeStats;
  equityCurve: { timestamp: number; equity: number }[];
  startTime: number;
  endTime: number;
}
