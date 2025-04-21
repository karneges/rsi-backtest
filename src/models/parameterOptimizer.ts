import { BacktestResult, HistoricalData, HistoricalTrade, TradeConfig } from '../types';
import { RsiTradeBasedModel } from './rsiTradeBasedModel';

/**
 * Optimizer for finding the best parameters for the RSI strategy
 */
export class ParameterOptimizer {
  private historicalData: HistoricalData[];
  private historicalTrades: HistoricalTrade[];
  private initialCapital: number;
  private symbol: string;
  private timeframe: string;

  constructor(
    historicalData: HistoricalData[], 
    historicalTrades: HistoricalTrade[],
    symbol: string, 
    timeframe: string, 
    initialCapital: number = 10000
  ) {
    this.historicalData = historicalData;
    this.historicalTrades = historicalTrades;
    this.initialCapital = initialCapital;
    this.symbol = symbol;
    this.timeframe = timeframe;
    
    if (!historicalTrades || historicalTrades.length === 0) {
      throw new Error('Trade data is required for the optimization process');
    }
  }

  /**
   * Optimize parameters for maximum profit
   */
  async optimizeForMaxProfit(): Promise<{ bestParams: TradeConfig; result: BacktestResult }> {
    // Define parameter ranges to test
    const leverageRange = [5, 10];
    const longEntryRsiRange = [20, 25, 30, 35];
    const longExitRsiRange = [50, 55, 60, 65];
    const shortEntryRsiRange = [65, 70, 75, 80];
    const shortExitRsiRange = [35, 40, 45, 50];
    const breakEvenThresholdRange = [0.5, 1, 1.5, 2];

    let bestResult: BacktestResult | null = null;
    let bestParams: TradeConfig | null = null;
    let maxProfit = -Infinity;

    // Start with limited combinations before doing a full grid search
    console.log('Starting parameter optimization...');
    
    // Iterate through all parameter combinations
    for (const leverage of leverageRange) {
      for (const longEntryRsi of longEntryRsiRange) {
        for (const longExitRsi of longExitRsiRange) {
          for (const shortEntryRsi of shortEntryRsiRange) {
            for (const shortExitRsi of shortExitRsiRange) {
              for (const breakEvenThreshold of breakEvenThresholdRange) {
                // Skip invalid combinations
                if (longExitRsi <= longEntryRsi || shortExitRsi >= shortEntryRsi) {
                  continue;
                }

                // Create config
                const config: TradeConfig = {
                  leverage,
                  longEntryRsi,
                  longExitRsi,
                  shortEntryRsi,
                  shortExitRsi,
                  breakEvenThreshold,
                  minProfitPercent: 1.0,               // Default to 1% minimum profit
                  fixedPositionSize: 1,                // Default to 1 USDT per trade
                  maxLossEntries: 100,                 // Default to 100 entries for losing positions
                  positionAddDelay: 60 * 1000,         // Default to 1 minute delay
                  symbol: this.symbol,
                  timeframe: this.timeframe
                };

                // Run backtest using the TradeBasedModel
                const model = new RsiTradeBasedModel(config, this.historicalData, this.historicalTrades, this.initialCapital);
                const result = await model.runTradeBasedBacktest();

                // Update best result if we found better profit
                if (result.stats.totalProfit > maxProfit) {
                  maxProfit = result.stats.totalProfit;
                  bestResult = result;
                  bestParams = config;
                  
                  console.log(`New best config found! Profit: ${maxProfit.toFixed(2)} USDT`);
                  console.log(`Parameters: LE=${longEntryRsi}, LX=${longExitRsi}, SE=${shortEntryRsi}, SX=${shortExitRsi}, BET=${breakEvenThreshold}, LEV=${leverage}`);
                }
              }
            }
          }
        }
      }
    }

    if (!bestResult || !bestParams) {
      throw new Error('Failed to find optimal parameters');
    }

    return {
      bestParams,
      result: bestResult
    };
  }

  /**
   * Optimize parameters for best risk-adjusted returns (Sharpe ratio)
   */
  async optimizeForSharpeRatio(): Promise<{ bestParams: TradeConfig; result: BacktestResult }> {
    // Define parameter ranges to test
    const leverageRange = [5, 10];
    const longEntryRsiRange = [20, 25, 30, 35];
    const longExitRsiRange = [50, 55, 60, 65];
    const shortEntryRsiRange = [65, 70, 75, 80];
    const shortExitRsiRange = [35, 40, 45, 50];
    const breakEvenThresholdRange = [0.5, 1, 1.5, 2];

    let bestResult: BacktestResult | null = null;
    let bestParams: TradeConfig | null = null;
    let maxSharpe = -Infinity;

    console.log('Starting parameter optimization for Sharpe ratio...');
    
    // Iterate through all parameter combinations
    for (const leverage of leverageRange) {
      for (const longEntryRsi of longEntryRsiRange) {
        for (const longExitRsi of longExitRsiRange) {
          for (const shortEntryRsi of shortEntryRsiRange) {
            for (const shortExitRsi of shortExitRsiRange) {
              for (const breakEvenThreshold of breakEvenThresholdRange) {
                // Skip invalid combinations
                if (longExitRsi <= longEntryRsi || shortExitRsi >= shortEntryRsi) {
                  continue;
                }

                // Create config
                const config: TradeConfig = {
                  leverage,
                  longEntryRsi,
                  longExitRsi,
                  shortEntryRsi,
                  shortExitRsi,
                  breakEvenThreshold,
                  minProfitPercent: 1.0,               // Default to 1% minimum profit
                  fixedPositionSize: 1,                // Default to 1 USDT per trade
                  maxLossEntries: 100,                 // Default to 100 entries for losing positions
                  positionAddDelay: 60 * 1000,         // Default to 1 minute delay
                  symbol: this.symbol,
                  timeframe: this.timeframe
                };

                // Run backtest using the TradeBasedModel
                const model = new RsiTradeBasedModel(config, this.historicalData, this.historicalTrades, this.initialCapital);
                const result = await model.runTradeBasedBacktest();

                // Update best result if we found better Sharpe ratio
                if (result.stats.sharpeRatio > maxSharpe) {
                  maxSharpe = result.stats.sharpeRatio;
                  bestResult = result;
                  bestParams = config;
                  
                  console.log(`New best config found! Sharpe: ${maxSharpe.toFixed(2)}, Profit: ${result.stats.totalProfit.toFixed(2)} USDT`);
                  console.log(`Parameters: LE=${longEntryRsi}, LX=${longExitRsi}, SE=${shortEntryRsi}, SX=${shortExitRsi}, BET=${breakEvenThreshold}, LEV=${leverage}`);
                }
              }
            }
          }
        }
      }
    }

    if (!bestResult || !bestParams) {
      throw new Error('Failed to find optimal parameters');
    }

    return {
      bestParams,
      result: bestResult
    };
  }

  /**
   * Run a single backtest with specific parameters
   */
  async runSingleBacktest(config: TradeConfig): Promise<BacktestResult> {
    const model = new RsiTradeBasedModel(config, this.historicalData, this.historicalTrades, this.initialCapital);
    return await model.runTradeBasedBacktest();
  }
} 